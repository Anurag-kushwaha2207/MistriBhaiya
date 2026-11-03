"""Shared helpers used by main.py and the feature routers (negotiation, contractor, assistant)."""
import time
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import HTTPException

from . import config
from .db import db
from .geo import bbox, haversine_km
from .realtime import hub

SKILLS = {  # key: (Hindi, English)
    "rajmistri": ("राजमिस्त्री", "Mason (Rajmistri)"),
    "labour": ("मज़दूर / हेल्पर", "Labour / Helper"),
    "plumber": ("प्लम्बर", "Plumber"),
    "electrician": ("इलेक्ट्रीशियन", "Electrician"),
    "painter": ("पेंटर", "Painter"),
    "carpenter": ("बढ़ई", "Carpenter"),
    "tiles": ("टाइल्स मिस्त्री", "Tiles Mistri"),
    "welder": ("वेल्डर", "Welder"),
    "pop": ("POP / सीलिंग", "POP / Ceiling"),
    "bar_bender": ("सरिया / बार बेंडर", "Steel / Bar bender"),
}


# ---------------------------------------------------------------- helpers
def today() -> date:
    return date.today()

def pdate(s: str) -> date:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(400, "Date must be YYYY-MM-DD")

def check_latlng(lat, lng):
    if lat is None or lng is None or not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise HTTPException(400, "Invalid location")

def clamp_radius(r):
    return max(0.5, min(float(r), config.MAX_RADIUS_KM))

def busy_ranges(c, worker_ids):
    """worker_id -> [(start_date, end_date)] of ACCEPTED bookings."""
    out = {w: [] for w in worker_ids}
    if not worker_ids:
        return out
    q = ",".join("?" * len(worker_ids))
    for r in c.execute(f"SELECT worker_id,start_date,days FROM bookings WHERE status='accepted' AND worker_id IN ({q})", list(worker_ids)):
        s = pdate(r["start_date"])
        out[r["worker_id"]].append((s, s + timedelta(days=max(1, r["days"]) - 1)))
    return out

def overlaps(ranges, start: date, days: int) -> bool:
    end = start + timedelta(days=max(1, days) - 1)
    return any(a <= end and start <= b for a, b in ranges)

def effective_status(wp, ranges, on_date: date, now: float) -> str:
    """The single source of truth for 'is this mistri free?'.
    Today : manual declaration (free auto-expires) + automatic BUSY when an accepted booking covers today.
    Other date : free if no accepted booking overlaps that date."""
    if overlaps(ranges, on_date, 1):
        return "busy"
    if on_date != today():
        return "free"
    if wp["status"] == "busy":
        return "busy"
    if wp["status"] == "free" and wp["free_until"] > now:
        return "free"
    return "offline"

def worker_public(u, wp, status, dist=None):
    av = ""
    try:
        av = u["avatar"] or ""
    except Exception:
        pass
    d = {
        "id": u["id"], "name": u["name"] or "Mistri", "avatar": av, "skills": [s for s in (wp["skills"] or "").split(",") if s],
        "daily_rate": wp["daily_rate"], "experience_years": wp["experience_years"], "village": wp["village"],
        "radius_km": wp["radius_km"], "status": status, "rating_avg": round(wp["rating_avg"] or 0, 1),
        "rating_count": wp["rating_count"], "verified": bool(wp["verified"]),
    }
    if dist is not None:
        d["distance_km"] = round(dist, 1)
    return d

async def push_worker_status(c, worker_id: int):
    r = c.execute("SELECT u.id,u.name,wp.* FROM users u JOIN worker_profiles wp ON wp.user_id=u.id WHERE u.id=?", (worker_id,)).fetchone()
    if not r:
        return
    st = effective_status(r, busy_ranges(c, [worker_id])[worker_id], today(), time.time())
    pub = worker_public(r, r, st)
    pub["id"] = worker_id
    pub["lat"], pub["lng"] = r["lat"], r["lng"]
    await hub.worker_status(pub)

def user_public(u):
    av = ""
    try:
        av = u["avatar"] or ""
    except Exception:
        pass
    phone = ""
    try:
        phone = u["phone"] or ""
    except Exception:
        pass
    return {"id": u["id"], "name": u["name"], "phone": phone, "phone_last4": phone[-4:] if phone else "", "role": u["role"], "lang": u["lang"], "is_admin": bool(u["is_admin"]), "avatar": av}


def need_role(u, role):
    if u["role"] != role:
        raise HTTPException(403, f"Only {role}s can do this")


def booking_view(b, names):
    d = dict(b)
    d["worker_name"] = names.get(b["worker_id"], "")
    d["customer_name"] = names.get(b["customer_id"], "")
    return d


def get_booking(c, bid, u):
    b = c.execute("SELECT * FROM bookings WHERE id=?", (bid,)).fetchone()
    if not b or u["id"] not in (b["worker_id"], b["customer_id"]):
        raise HTTPException(404, "Booking not found")
    return b

def set_booking(c, bid, status):
    c.execute("UPDATE bookings SET status=?,updated_at=? WHERE id=?", (status, time.time(), bid))

