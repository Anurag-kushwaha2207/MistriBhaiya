"""Contractor (thekedar) features.
A contractor is a third role. He has a crew of regular mistris/labour (registered workers or offline labour he manages),
gets project requests from home-owners, negotiates the budget, assigns crew, marks attendance and keeps a wage ledger.
Because the contractor is the single point of responsibility, the home-owner talks only to him if something goes wrong.
"""
import time
from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from . import config, firebase_sync
from .calls import connect_call
from .common import *
from .db import db
from .realtime import hub
from .security import current_user, norm_phone, rate_limit

router = APIRouter()

def contractor_only(u):
    need_role(u, "contractor")

# ---------------------------------------------------------------- profile + discovery
class ContractorProfile(BaseModel):
    company: str = Field("", max_length=80)
    skills: List[str] = []
    village: str = Field("", max_length=80)
    lat: float
    lng: float
    radius_km: float = 25
    min_budget: int = Field(0, ge=0)
    experience_years: int = Field(0, ge=0, le=60)
    about: str = Field("", max_length=300)

@router.put("/api/contractor/profile")
def contractor_profile(req: ContractorProfile, u=Depends(current_user)):
    contractor_only(u)
    check_latlng(req.lat, req.lng)
    skills = [s for s in req.skills if s in SKILLS]
    with db() as c:
        c.execute("UPDATE contractor_profiles SET company=?,skills=?,village=?,lat=?,lng=?,radius_km=?,min_budget=?,experience_years=?,about=? WHERE user_id=?",
                  (req.company, ",".join(skills), req.village, req.lat, req.lng, clamp_radius(req.radius_km), req.min_budget, req.experience_years, req.about, u["id"]))
    firebase_sync.sync_contractor_profile(u["id"])
    return {"ok": True}

@router.get("/api/contractors/search")
def contractors_search(lat: float, lng: float, radius_km: float = 25, skill: str = "", min_rating: float = 0, sort: str = "distance",
                       u=Depends(current_user)):
    check_latlng(lat, lng)
    r = clamp_radius(radius_km)
    la0, la1, ln0, ln1 = bbox(lat, lng, r)
    with db() as c:
        rows = c.execute("SELECT u.id,u.name,cp.* FROM users u JOIN contractor_profiles cp ON cp.user_id=u.id "
                         "WHERE cp.lat BETWEEN ? AND ? AND cp.lng BETWEEN ? AND ?", (la0, la1, ln0, ln1)).fetchall()
        out = []
        for x in rows:
            d = haversine_km(lat, lng, x["lat"], x["lng"])
            if d > r or d > x["radius_km"]:
                continue
            if skill and f",{skill}," not in f",{x['skills']},":
                continue
            if (x["rating_avg"] or 0) < min_rating:
                continue
            crew = c.execute("SELECT COUNT(*) FROM crew_members WHERE contractor_id=? AND status='active'", (x["id"],)).fetchone()[0]
            out.append({"id": x["id"], "name": x["name"] or "Contractor", "company": x["company"], "skills": [s for s in x["skills"].split(",") if s],
                        "village": x["village"], "distance_km": round(d, 1), "rating_avg": round(x["rating_avg"] or 0, 1), "rating_count": x["rating_count"],
                        "verified": bool(x["verified"]), "experience_years": x["experience_years"], "min_budget": x["min_budget"], "about": x["about"], "crew_size": crew})
    out.sort(key=(lambda z: (-z["rating_avg"], z["distance_km"])) if sort == "rating" else (lambda z: (-z["crew_size"], z["distance_km"])) if sort == "crew" else (lambda z: z["distance_km"]))
    return {"contractors": out[:50]}

# ---------------------------------------------------------------- find workers for the crew (many filters)
@router.get("/api/contractor/find-workers")
def find_workers(lat: float, lng: float, radius_km: float = 10, skill: str = "", max_rate: int = 0, free_only: bool = False,
                 on_date: str = "", min_hours_free: float = 0, sort: str = "smart", respect_worker_radius: bool = False,
                 limit: int = Query(60, le=200), u=Depends(current_user)):
    """Filters: distance, wage ceiling (max_rate), free now, date, and 'free for at least N more hours today'."""
    contractor_only(u)
    check_latlng(lat, lng)
    r = clamp_radius(radius_km)
    d0 = pdate(on_date) if on_date else today()
    now = time.time()
    la0, la1, ln0, ln1 = bbox(lat, lng, r)
    sql = ("SELECT u.id,u.name,wp.* FROM users u JOIN worker_profiles wp ON wp.user_id=u.id "
           "WHERE wp.lat BETWEEN ? AND ? AND wp.lng BETWEEN ? AND ? AND wp.skills!=''")
    args = [la0, la1, ln0, ln1]
    if skill:
        sql += " AND (',' || wp.skills || ',') LIKE ?"
        args.append(f"%,{skill},%")
    with db() as c:
        rows = c.execute(sql, args).fetchall()
        ranges = busy_ranges(c, [x["id"] for x in rows])
        mine = {x["worker_id"] for x in c.execute("SELECT worker_id FROM crew_members WHERE contractor_id=? AND worker_id IS NOT NULL AND status IN ('active','invited')", (u["id"],))}
    out = []
    for w in rows:
        d = haversine_km(lat, lng, w["lat"], w["lng"])
        if d > r or (respect_worker_radius and d > w["radius_km"]):
            continue
        if max_rate and w["daily_rate"] and w["daily_rate"] > max_rate:
            continue
        st = effective_status(w, ranges[w["id"]], d0, now)
        if free_only and st != "free":
            continue
        if min_hours_free and d0 == today() and not (st == "free" and w["free_until"] - now >= min_hours_free * 3600):
            continue
        item = worker_public(w, w, st, d)
        item["in_crew"] = w["id"] in mine
        if st == "free" and d0 == today():
            item["free_hours_left"] = round(max(0, (w["free_until"] - now) / 3600), 1)
        out.append(item)
    order = {"free": 0, "busy": 1, "offline": 2}
    if sort == "rate":
        out.sort(key=lambda x: (x["daily_rate"] or 10**9, x["distance_km"]))
    elif sort == "rating":
        out.sort(key=lambda x: (-x["rating_avg"], x["distance_km"]))
    elif sort == "distance":
        out.sort(key=lambda x: x["distance_km"])
    else:
        out.sort(key=lambda x: (order[x["status"]], x["distance_km"]))
    return {"workers": out[:limit], "count": len(out)}

# ---------------------------------------------------------------- crew
class CrewReq(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    phone: str = ""
    skills: List[str] = []
    daily_rate: int = Field(0, ge=0, le=100000)
    notes: str = Field("", max_length=200)

class CrewFromWorker(BaseModel):
    daily_rate: int = Field(0, ge=0, le=100000)

class CrewUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=60)
    skills: Optional[List[str]] = None
    daily_rate: Optional[int] = Field(None, ge=0, le=100000)
    notes: Optional[str] = Field(None, max_length=200)

def crew_row(c, m, now, ranges):
    d = {"id": m["id"], "name": m["name"], "phone_last4": (m["phone"] or "")[-4:], "skills": [s for s in (m["skills"] or "").split(",") if s],
         "daily_rate": m["daily_rate"], "status": m["status"], "notes": m["notes"], "registered": m["worker_id"] is not None, "live_status": None}
    if m["worker_id"]:
        w = c.execute("SELECT wp.*,u.name FROM worker_profiles wp JOIN users u ON u.id=wp.user_id WHERE wp.user_id=?", (m["worker_id"],)).fetchone()
        if w:
            d["live_status"] = effective_status(w, ranges.get(m["worker_id"], []), today(), now)
            d["rating_avg"] = round(w["rating_avg"] or 0, 1)
    return d

@router.get("/api/contractor/crew")
def crew_list(u=Depends(current_user)):
    contractor_only(u)
    now = time.time()
    with db() as c:
        rows = c.execute("SELECT * FROM crew_members WHERE contractor_id=? AND status!='removed' ORDER BY id DESC", (u["id"],)).fetchall()
        ranges = busy_ranges(c, [r["worker_id"] for r in rows if r["worker_id"]])
        out = [crew_row(c, r, now, ranges) for r in rows]
    return {"crew": out}

@router.post("/api/contractor/crew")
async def crew_add(req: CrewReq, u=Depends(current_user)):
    """Add a person by phone. If the phone belongs to a registered worker he gets an invite; otherwise he is an offline labour managed by you."""
    contractor_only(u)
    phone = norm_phone(req.phone) if req.phone.strip() else ""
    skills = [s for s in req.skills if s in SKILLS]
    invite_uid = None
    with db() as c:
        if phone:
            dup = c.execute("SELECT 1 FROM crew_members WHERE contractor_id=? AND phone=? AND status IN ('active','invited')", (u["id"], phone)).fetchone()
            if dup:
                raise HTTPException(409, "This person is already in your crew")
            wk = c.execute("SELECT id FROM users WHERE phone=? AND role='worker'", (phone,)).fetchone()
        else:
            wk = None
        status = "invited" if wk else "active"
        cur = c.execute("INSERT INTO crew_members(contractor_id,worker_id,name,phone,skills,daily_rate,status,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                        (u["id"], wk["id"] if wk else None, req.name.strip(), phone, ",".join(skills), req.daily_rate, status, req.notes, time.time()))
        cid = cur.lastrowid
        if wk:
            invite_uid = wk["id"]
    if invite_uid:
        await hub.to_user(invite_uid, {"type": "crew_invite", "crew_id": cid, "contractor": u["name"] or "Contractor"})
    return {"id": cid, "status": status}

@router.post("/api/contractor/crew/from-worker/{wid}")
async def crew_from_worker(wid: int, req: CrewFromWorker, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        w = c.execute("SELECT u.id,u.name,u.phone,wp.skills,wp.daily_rate FROM users u JOIN worker_profiles wp ON wp.user_id=u.id WHERE u.id=?", (wid,)).fetchone()
        if not w:
            raise HTTPException(404, "Worker not found")
        if c.execute("SELECT 1 FROM crew_members WHERE contractor_id=? AND worker_id=? AND status IN ('active','invited')", (u["id"], wid)).fetchone():
            raise HTTPException(409, "Already in your crew")
        cur = c.execute("INSERT INTO crew_members(contractor_id,worker_id,name,phone,skills,daily_rate,status,created_at) VALUES(?,?,?,?,?,?,'invited',?)",
                        (u["id"], wid, w["name"] or "Mistri", w["phone"], w["skills"], req.daily_rate or w["daily_rate"], time.time()))
        cid = cur.lastrowid
    await hub.to_user(wid, {"type": "crew_invite", "crew_id": cid, "contractor": u["name"] or "Contractor"})
    return {"id": cid, "status": "invited"}

def own_crew(c, cid, u):
    m = c.execute("SELECT * FROM crew_members WHERE id=? AND contractor_id=?", (cid, u["id"])).fetchone()
    if not m:
        raise HTTPException(404, "Crew member not found")
    return m

@router.put("/api/contractor/crew/{cid}")
def crew_update(cid: int, req: CrewUpdate, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        m = own_crew(c, cid, u)
        c.execute("UPDATE crew_members SET name=?,skills=?,daily_rate=?,notes=? WHERE id=?",
                  (req.name if req.name is not None else m["name"], ",".join(s for s in req.skills if s in SKILLS) if req.skills is not None else m["skills"],
                   req.daily_rate if req.daily_rate is not None else m["daily_rate"], req.notes if req.notes is not None else m["notes"], cid))
    return {"ok": True}

@router.delete("/api/contractor/crew/{cid}")
def crew_remove(cid: int, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        own_crew(c, cid, u)
        c.execute("UPDATE crew_members SET status='removed' WHERE id=?", (cid,))
    return {"ok": True}

# worker side of crew invitations
@router.get("/api/worker/invites")
def worker_invites(u=Depends(current_user)):
    need_role(u, "worker")
    with db() as c:
        rows = c.execute("SELECT m.id,m.daily_rate,u.name AS contractor,cp.company FROM crew_members m JOIN users u ON u.id=m.contractor_id "
                         "LEFT JOIN contractor_profiles cp ON cp.user_id=m.contractor_id WHERE m.worker_id=? AND m.status='invited'", (u["id"],)).fetchall()
    return {"invites": [dict(r) for r in rows]}

class InviteReply(BaseModel):
    accept: bool

@router.post("/api/worker/invites/{cid}/respond")
async def invite_respond(cid: int, req: InviteReply, u=Depends(current_user)):
    need_role(u, "worker")
    with db() as c:
        m = c.execute("SELECT * FROM crew_members WHERE id=? AND worker_id=? AND status='invited'", (cid, u["id"])).fetchone()
        if not m:
            raise HTTPException(404, "Invite not found")
        c.execute("UPDATE crew_members SET status=? WHERE id=?", ("active" if req.accept else "declined", cid))
    await hub.to_user(m["contractor_id"], {"type": "crew_update", "crew_id": cid, "status": "active" if req.accept else "declined", "name": u["name"]})
    return {"ok": True}

# ---------------------------------------------------------------- projects (customer <-> contractor)
class ProjectReq(BaseModel):
    contractor_id: int
    title: str = Field(min_length=2, max_length=100)
    description: str = Field("", max_length=600)
    address: str = Field("", max_length=200)
    lat: Optional[float] = None
    lng: Optional[float] = None
    skill: str = ""
    start_date: str
    days: int = Field(1, ge=1, le=365)
    budget: int = Field(0, ge=0, le=100_000_000)          # total budget offered by the customer
    workers_needed: int = Field(1, ge=1, le=200)

def project_party(c, pid, u):
    p = c.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if not p or u["id"] not in (p["customer_id"], p["contractor_id"]):
        raise HTTPException(404, "Project not found")
    return p

@router.post("/api/projects")
async def project_create(req: ProjectReq, u=Depends(current_user)):
    need_role(u, "customer")
    if pdate(req.start_date) < today():
        raise HTTPException(400, "Start date is in the past")
    now = time.time()
    with db() as c:
        if not c.execute("SELECT 1 FROM users WHERE id=? AND role='contractor'", (req.contractor_id,)).fetchone():
            raise HTTPException(404, "Contractor not found")
        cur = c.execute("INSERT INTO projects(customer_id,contractor_id,title,description,address,lat,lng,skill,start_date,days,budget,workers_needed,offer_by,offer_rounds,created_at,updated_at) "
                        "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)",
                        (u["id"], req.contractor_id, req.title, req.description, req.address, req.lat, req.lng, req.skill, req.start_date, req.days, req.budget, req.workers_needed, u["id"], now, now))
        pid = cur.lastrowid
        c.execute("INSERT INTO offers(kind,ref_id,from_id,rate,days,note,created_at) VALUES('project',?,?,?,?,?,?)", (pid, u["id"], req.budget, req.days, "", now))
    await hub.to_user(req.contractor_id, {"type": "project_new", "project_id": pid, "title": req.title, "customer": u["name"] or "Customer"})
    return {"id": pid}

@router.get("/api/projects/mine")
def projects_mine(u=Depends(current_user)):
    col = "contractor_id" if u["role"] == "contractor" else "customer_id"
    with db() as c:
        rows = c.execute(f"SELECT p.*,cu.name AS customer_name,ku.name AS contractor_name FROM projects p JOIN users cu ON cu.id=p.customer_id JOIN users ku ON ku.id=p.contractor_id "
                         f"WHERE p.{col}=? ORDER BY p.created_at DESC LIMIT 100", (u["id"],)).fetchall()
        out = []
        for p in rows:
            d = dict(p)
            d["crew_assigned"] = c.execute("SELECT COUNT(*) FROM project_crew WHERE project_id=?", (p["id"],)).fetchone()[0]
            d["my_turn"] = p["status"] == "requested" and p["offer_by"] != u["id"]
            out.append(d)
    return {"projects": out}

@router.get("/api/projects/{pid}")
def project_detail(pid: int, u=Depends(current_user)):
    with db() as c:
        p = project_party(c, pid, u)
        crew = c.execute("SELECT pc.crew_id,pc.daily_rate,m.name,m.skills FROM project_crew pc JOIN crew_members m ON m.id=pc.crew_id WHERE pc.project_id=?", (pid,)).fetchall()
        att = c.execute("SELECT crew_id,day,present,wage FROM attendance WHERE project_id=? ORDER BY day DESC LIMIT 400", (pid,)).fetchall()
    out = {"project": dict(p), "crew": [dict(x) for x in crew]}
    if u["role"] == "contractor":
        out["attendance"] = [dict(a) for a in att]
        out["wages_total"] = sum(a["wage"] for a in att if a["present"])
    return out

@router.post("/api/projects/{pid}/start")
async def project_start(pid: int, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        p = project_party(c, pid, u)
        if p["contractor_id"] != u["id"] or p["status"] != "accepted":
            raise HTTPException(400, "Project must be accepted first")
        c.execute("UPDATE projects SET status='in_progress',updated_at=? WHERE id=?", (time.time(), pid))
    await hub.to_user(p["customer_id"], {"type": "project_update", "project_id": pid, "status": "in_progress"})
    return {"ok": True}

@router.post("/api/projects/{pid}/complete")
async def project_complete(pid: int, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        p = project_party(c, pid, u)
        if p["contractor_id"] != u["id"] or p["status"] not in ("accepted", "in_progress"):
            raise HTTPException(400, "Cannot complete")
        c.execute("UPDATE projects SET status='completed',updated_at=? WHERE id=?", (time.time(), pid))
    await hub.to_user(p["customer_id"], {"type": "project_update", "project_id": pid, "status": "completed"})
    return {"ok": True}

@router.post("/api/projects/{pid}/cancel")
async def project_cancel(pid: int, u=Depends(current_user)):
    with db() as c:
        p = project_party(c, pid, u)
        if p["status"] not in ("requested", "accepted"):
            raise HTTPException(400, "Cannot cancel now")
        c.execute("UPDATE projects SET status='cancelled',updated_at=? WHERE id=?", (time.time(), pid))
    other = p["contractor_id"] if u["id"] == p["customer_id"] else p["customer_id"]
    await hub.to_user(other, {"type": "project_update", "project_id": pid, "status": "cancelled"})
    return {"ok": True}

class RateReq(BaseModel):
    stars: int = Field(ge=1, le=5)
    review: str = Field("", max_length=300)

@router.post("/api/projects/{pid}/rate")
def project_rate(pid: int, req: RateReq, u=Depends(current_user)):
    need_role(u, "customer")
    with db() as c:
        p = project_party(c, pid, u)
        if p["customer_id"] != u["id"] or p["status"] != "completed" or p["rating"]:
            raise HTTPException(400, "Cannot rate this project")
        c.execute("UPDATE projects SET rating=?,review=? WHERE id=?", (req.stars, req.review, pid))
        c.execute("UPDATE contractor_profiles SET rating_avg=(rating_avg*rating_count+?)/(rating_count+1), rating_count=rating_count+1 WHERE user_id=?", (req.stars, p["contractor_id"]))
    return {"ok": True}

class AssignReq(BaseModel):
    crew_ids: List[int]

@router.post("/api/projects/{pid}/assign")
async def project_assign(pid: int, req: AssignReq, u=Depends(current_user)):
    contractor_only(u)
    notify = []
    with db() as c:
        p = project_party(c, pid, u)
        if p["contractor_id"] != u["id"] or p["status"] not in ("accepted", "in_progress"):
            raise HTTPException(400, "Accept the project first")
        for cid in req.crew_ids:
            m = c.execute("SELECT * FROM crew_members WHERE id=? AND contractor_id=? AND status='active'", (cid, u["id"])).fetchone()
            if not m:
                raise HTTPException(400, f"Crew member {cid} is not an active member of your crew")
            c.execute("INSERT OR REPLACE INTO project_crew(project_id,crew_id,daily_rate) VALUES(?,?,?)", (pid, cid, m["daily_rate"]))
            if m["worker_id"]:
                notify.append(m["worker_id"])
    for wid in notify:
        await hub.to_user(wid, {"type": "crew_assigned", "project_id": pid, "title": p["title"], "start_date": p["start_date"]})
    return {"ok": True, "assigned": len(req.crew_ids)}

class AttReq(BaseModel):
    crew_id: int
    day: str
    present: bool = True
    wage: Optional[int] = Field(None, ge=0, le=100000)

@router.post("/api/projects/{pid}/attendance")
def project_attendance(pid: int, req: AttReq, u=Depends(current_user)):
    contractor_only(u)
    d = pdate(req.day)
    with db() as c:
        p = project_party(c, pid, u)
        if p["contractor_id"] != u["id"]:
            raise HTTPException(403, "Not your project")
        pc = c.execute("SELECT * FROM project_crew WHERE project_id=? AND crew_id=?", (pid, req.crew_id)).fetchone()
        if not pc:
            raise HTTPException(400, "Assign this crew member to the project first")
        start = pdate(p["start_date"])
        if d < start or d > start + timedelta(days=max(0, p["days"] - 1) + 30):
            raise HTTPException(400, "Day is outside the project period")
        wage = (req.wage if req.wage is not None else pc["daily_rate"]) if req.present else 0
        c.execute("INSERT OR REPLACE INTO attendance(project_id,crew_id,day,present,wage) VALUES(?,?,?,?,?)", (pid, req.crew_id, d.isoformat(), 1 if req.present else 0, wage))
    return {"ok": True, "wage": wage}

@router.post("/api/projects/{pid}/call")
def project_call(pid: int, u=Depends(current_user)):
    """Home-owner <-> contractor call (masked when CALL_PROVIDER=exotel)."""
    rate_limit(f"pcall:{u['id']}", 20, 3600)
    with db() as c:
        p = project_party(c, pid, u)
        other_id = p["contractor_id"] if u["id"] == p["customer_id"] else p["customer_id"]
        other = c.execute("SELECT phone FROM users WHERE id=?", (other_id,)).fetchone()
        try:
            res = connect_call(u["phone"], other["phone"])
        except Exception as e:
            raise HTTPException(502, f"Call provider error: {e}")
        c.execute("INSERT INTO call_logs(caller_id,callee_id,booking_id,provider,provider_call_id,status,created_at) VALUES(?,?,?,?,?,?,?)",
                  (u["id"], other_id, None, res["provider"], res.get("provider_call_id", ""), "project", time.time()))
    return res

# ---------------------------------------------------------------- ledger (wages, advances, payments)
class LedgerReq(BaseModel):
    crew_id: int
    kind: str = Field(pattern="^(advance|payment)$")
    amount: int = Field(gt=0, le=10_000_000)
    note: str = Field("", max_length=200)
    project_id: Optional[int] = None

@router.post("/api/contractor/ledger")
def ledger_add(req: LedgerReq, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        own_crew(c, req.crew_id, u)
        c.execute("INSERT INTO ledger(contractor_id,crew_id,project_id,kind,amount,note,created_at) VALUES(?,?,?,?,?,?,?)",
                  (u["id"], req.crew_id, req.project_id, req.kind, req.amount, req.note, time.time()))
    return {"ok": True}

@router.get("/api/contractor/ledger/summary")
def ledger_summary(u=Depends(current_user)):
    """Per crew member: wages earned (from attendance) - advances - payments = balance still to pay."""
    contractor_only(u)
    with db() as c:
        crew = c.execute("SELECT id,name FROM crew_members WHERE contractor_id=? AND status!='removed'", (u["id"],)).fetchall()
        out = []
        for m in crew:
            earned = c.execute("SELECT COALESCE(SUM(a.wage),0) FROM attendance a JOIN projects p ON p.id=a.project_id WHERE a.crew_id=? AND p.contractor_id=? AND a.present=1", (m["id"], u["id"])).fetchone()[0]
            adv = c.execute("SELECT COALESCE(SUM(amount),0) FROM ledger WHERE contractor_id=? AND crew_id=? AND kind='advance'", (u["id"], m["id"])).fetchone()[0]
            paid = c.execute("SELECT COALESCE(SUM(amount),0) FROM ledger WHERE contractor_id=? AND crew_id=? AND kind='payment'", (u["id"], m["id"])).fetchone()[0]
            days = c.execute("SELECT COUNT(*) FROM attendance a JOIN projects p ON p.id=a.project_id WHERE a.crew_id=? AND p.contractor_id=? AND a.present=1", (m["id"], u["id"])).fetchone()[0]
            out.append({"crew_id": m["id"], "name": m["name"], "days": days, "earned": earned, "advance": adv, "paid": paid, "balance": earned - adv - paid})
    return {"summary": out, "total_due": sum(x["balance"] for x in out)}

@router.get("/api/contractor/dashboard")
def contractor_dashboard(u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        one = lambda q, *a: c.execute(q, a).fetchone()[0]
        d = {
            "crew_active": one("SELECT COUNT(*) FROM crew_members WHERE contractor_id=? AND status='active'", u["id"]),
            "crew_invited": one("SELECT COUNT(*) FROM crew_members WHERE contractor_id=? AND status='invited'", u["id"]),
            "new_requests": one("SELECT COUNT(*) FROM projects WHERE contractor_id=? AND status='requested' AND offer_by!=?", u["id"], u["id"]),
            "active_projects": one("SELECT COUNT(*) FROM projects WHERE contractor_id=? AND status IN ('accepted','in_progress')", u["id"]),
            "completed_projects": one("SELECT COUNT(*) FROM projects WHERE contractor_id=? AND status='completed'", u["id"]),
            "business_value": one("SELECT COALESCE(SUM(budget),0) FROM projects WHERE contractor_id=? AND status IN ('accepted','in_progress','completed')", u["id"]),
        }
    d["wages_due"] = ledger_summary(u)["total_due"]
    return d
