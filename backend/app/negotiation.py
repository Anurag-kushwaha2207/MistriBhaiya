"""Negotiation (counter-offers) + booking/project chat.
Works for both kinds of deals:
  bookings : customer <-> worker, amount = daily rate (days can be negotiated too)
  projects : customer <-> contractor, amount = total project budget
Rules: the party who made the LAST offer cannot accept it; the other party can accept, counter, or reject.
Phone numbers typed in chat are masked so the deal stays on the platform.
"""
import re, secrets, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from . import firebase_sync
from .common import *            # helpers
from .db import db
from .realtime import hub
from .security import current_user, rate_limit

router = APIRouter()
MAX_ROUNDS = 8
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\s*91[\s-]*)?[6-9](?:[\s-]*\d){9}(?!\d)")

def mask_phones(t: str) -> str:
    return PHONE_RE.sub("[number hidden]", t)

KINDS = {"bookings": "booking", "projects": "project"}

def load(c, kind: str, rid: int, u):
    """Returns (row, other_party_id). Raises 404 if the user is not a participant."""
    if kind not in KINDS:
        raise HTTPException(404, "Unknown type")
    if kind == "bookings":
        r = c.execute("SELECT * FROM bookings WHERE id=?", (rid,)).fetchone()
        parties = (r["customer_id"], r["worker_id"]) if r else ()
    else:
        r = c.execute("SELECT * FROM projects WHERE id=?", (rid,)).fetchone()
        parties = (r["customer_id"], r["contractor_id"]) if r else ()
    if not r or u["id"] not in parties:
        raise HTTPException(404, "Not found")
    other = parties[1] if u["id"] == parties[0] else parties[0]
    return r, other

def notify_event(kind):
    return "booking_update" if kind == "bookings" else "project_update"

class CounterReq(BaseModel):
    rate: int = Field(ge=50, le=10_000_000)        # bookings: Rs per day; projects: total budget
    days: Optional[int] = Field(None, ge=1, le=365)
    note: str = Field("", max_length=200)

def set_offer(c, kind, r, u, rate, days, note):
    k = KINDS[kind]
    days = days or r["days"]
    now = time.time()
    c.execute("INSERT INTO offers(kind,ref_id,from_id,rate,days,note,created_at) VALUES(?,?,?,?,?,?,?)", (k, r["id"], u["id"], rate, days, mask_phones(note), now))
    if kind == "bookings":
        c.execute("UPDATE bookings SET agreed_rate=?,days=?,offer_by=?,offer_rounds=offer_rounds+1,updated_at=? WHERE id=?", (rate, days, u["id"], now, r["id"]))
    else:
        c.execute("UPDATE projects SET budget=?,days=?,offer_by=?,offer_rounds=offer_rounds+1,updated_at=? WHERE id=?", (rate, days, u["id"], now, r["id"]))

@router.post("/api/{kind}/{rid}/counter")
async def counter(kind: str, rid: int, req: CounterReq, u=Depends(current_user)):
    with db() as c:
        r, other = load(c, kind, rid, u)
        if r["status"] != "requested":
            raise HTTPException(400, "Negotiation is only possible before acceptance")
        if r["offer_by"] == u["id"]:
            raise HTTPException(400, "Wait for the other side to reply to your offer")
        if (r["offer_rounds"] or 0) >= MAX_ROUNDS:
            raise HTTPException(400, "Too many rounds. Please accept or reject.")
        set_offer(c, kind, r, u, req.rate, req.days, req.note)
    await hub.to_user(other, {"type": notify_event(kind), ("booking_id" if kind == "bookings" else "project_id"): rid,
                              "status": "countered", "rate": req.rate, "days": req.days or r["days"], "from": u["name"] or "User"})
    if kind == "bookings":
        firebase_sync.sync_booking(rid)
    else:
        firebase_sync.sync_project(rid)
    return {"ok": True}

@router.post("/api/{kind}/{rid}/accept")
async def accept(kind: str, rid: int, u=Depends(current_user)):
    """Accept the other side's latest offer. Deal is fixed at that amount."""
    with db() as c:
        r, other = load(c, kind, rid, u)
        if r["status"] != "requested":
            raise HTTPException(400, "Nothing to accept")
        if r["offer_by"] == u["id"]:
            raise HTTPException(400, "You cannot accept your own offer. Wait for the other side.")
        now = time.time()
        if kind == "bookings":
            if overlaps(busy_ranges(c, [r["worker_id"]])[r["worker_id"]], pdate(r["start_date"]), r["days"]):
                raise HTTPException(409, "Worker already has a booking on these dates")
            c.execute("UPDATE bookings SET status='accepted',start_otp=?,updated_at=? WHERE id=?", (f"{secrets.randbelow(9000) + 1000}", now, rid))
            if r["job_id"]:
                c.execute("UPDATE jobs SET status='assigned' WHERE id=?", (r["job_id"],))
            await push_worker_status(c, r["worker_id"])
        else:
            c.execute("UPDATE projects SET status='accepted',updated_at=? WHERE id=?", (now, rid))
    if kind == "bookings":
        firebase_sync.sync_booking(rid)
        firebase_sync.sync_worker_profile(r["worker_id"])
    else:
        firebase_sync.sync_project(rid)
    await hub.to_user(other, {"type": notify_event(kind), ("booking_id" if kind == "bookings" else "project_id"): rid, "status": "accepted"})
    return {"ok": True}

@router.post("/api/{kind}/{rid}/reject")
async def reject(kind: str, rid: int, u=Depends(current_user)):
    with db() as c:
        r, other = load(c, kind, rid, u)
        if r["status"] != "requested":
            raise HTTPException(400, "Cannot reject now")
        c.execute(f"UPDATE {kind} SET status='rejected',updated_at=? WHERE id=?", (time.time(), rid))
    if kind == "bookings":
        firebase_sync.sync_booking(rid)
    else:
        firebase_sync.sync_project(rid)
    await hub.to_user(other, {"type": notify_event(kind), ("booking_id" if kind == "bookings" else "project_id"): rid, "status": "rejected"})
    return {"ok": True}

@router.get("/api/{kind}/{rid}/negotiation")
def negotiation(kind: str, rid: int, u=Depends(current_user)):
    with db() as c:
        r, other = load(c, kind, rid, u)
        rows = c.execute("SELECT o.*,u.name AS fname FROM offers o JOIN users u ON u.id=o.from_id WHERE o.kind=? AND o.ref_id=? ORDER BY o.id", (KINDS[kind], rid)).fetchall()
    cur_rate = r["agreed_rate"] if kind == "bookings" else r["budget"]
    return {"status": r["status"], "rounds": r["offer_rounds"] or 0, "max_rounds": MAX_ROUNDS, "current": {"rate": cur_rate, "days": r["days"]},
            "my_turn": r["status"] == "requested" and r["offer_by"] != u["id"], "last_offer_by_me": r["offer_by"] == u["id"],
            "offers": [{"id": o["id"], "mine": o["from_id"] == u["id"], "from": o["fname"] or "User", "rate": o["rate"], "days": o["days"], "note": o["note"], "at": o["created_at"]} for o in rows]}

class MsgReq(BaseModel):
    text: str = Field(min_length=1, max_length=500)

@router.post("/api/{kind}/{rid}/messages")
async def post_message(kind: str, rid: int, req: MsgReq, u=Depends(current_user)):
    rate_limit(f"msg:{u['id']}", 40, 60)
    text = mask_phones(req.text.strip())
    with db() as c:
        r, other = load(c, kind, rid, u)
        c.execute("INSERT INTO messages(kind,ref_id,from_id,text,created_at) VALUES(?,?,?,?,?)", (KINDS[kind], rid, u["id"], text, time.time()))
    await hub.to_user(other, {"type": "chat", "kind": kind, "ref_id": rid, "from": u["name"] or "User", "text": text})
    return {"ok": True, "text": text}

@router.get("/api/{kind}/{rid}/messages")
def get_messages(kind: str, rid: int, u=Depends(current_user)):
    with db() as c:
        load(c, kind, rid, u)
        rows = c.execute("SELECT m.*,u.name AS fname FROM messages m JOIN users u ON u.id=m.from_id WHERE m.kind=? AND m.ref_id=? ORDER BY m.id DESC LIMIT 100", (KINDS[kind], rid)).fetchall()
    return {"messages": [{"id": m["id"], "mine": m["from_id"] == u["id"], "from": m["fname"] or "User", "text": m["text"], "at": m["created_at"]} for m in reversed(rows)]}
