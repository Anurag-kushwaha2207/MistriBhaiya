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
from .realtime import hub, notify
from .security import current_user, norm_phone, rate_limit

router = APIRouter()

def contractor_only(u):
    need_role(u, "contractor")

# ---------------------------------------------------------------- profile + discovery
class ContractorProfile(BaseModel):
    company: str = Field("", max_length=80)
    skills: List[str] = []
    village: str = Field("", max_length=80)
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: float = 25
    min_budget: int = Field(0, ge=0)
    experience_years: int = Field(0, ge=0, le=60)
    about: str = Field("", max_length=300)

class ContractorLocReq(BaseModel):
    lat: float
    lng: float

@router.put("/api/contractor/profile")
def contractor_profile(req: ContractorProfile, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        cp = c.execute("SELECT * FROM contractor_profiles WHERE user_id=?", (u["id"],)).fetchone()
        new_lat = req.lat if req.lat is not None else (cp["lat"] if cp and cp["lat"] is not None else None)
        new_lng = req.lng if req.lng is not None else (cp["lng"] if cp and cp["lng"] is not None else None)
        if new_lat is None or new_lng is None:
            raise HTTPException(400, "Location (lat, lng) is required for contractor profile")
        check_latlng(new_lat, new_lng)
        skills = [s for s in req.skills if s in SKILLS]
        c.execute("UPDATE contractor_profiles SET company=?,skills=?,village=?,lat=?,lng=?,radius_km=?,min_budget=?,experience_years=?,about=? WHERE user_id=?",
                  (req.company, ",".join(skills), req.village, new_lat, new_lng, clamp_radius(req.radius_km), req.min_budget, req.experience_years, req.about, u["id"]))
    firebase_sync.sync_contractor_profile(u["id"])
    return {"ok": True, "profile": {"lat": new_lat, "lng": new_lng}}

@router.post("/api/contractor/location")
@router.put("/api/contractor/location")
def contractor_location(req: ContractorLocReq, u=Depends(current_user)):
    contractor_only(u)
    check_latlng(req.lat, req.lng)
    with db() as c:
        c.execute("UPDATE contractor_profiles SET lat=?,lng=? WHERE user_id=?", (req.lat, req.lng, u["id"]))
    firebase_sync.sync_contractor_profile(u["id"])
    return {"ok": True, "lat": req.lat, "lng": req.lng}

@router.get("/api/contractors")
@router.get("/api/contractors/search")
def contractors_search(lat: Optional[float] = None, lng: Optional[float] = None, radius_km: float = 25, skill: str = "", min_rating: float = 0, sort: str = "distance",
                       on_date: str = "", date: str = "", expand: bool = False, u=Depends(current_user)):
    target_date = on_date or date
    w_lat = lat
    w_lng = lng
    if w_lat is None or w_lng is None:
        with db() as c:
            if u["role"] == "worker":
                p = c.execute("SELECT lat, lng FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone()
            elif u["role"] == "contractor":
                p = c.execute("SELECT lat, lng FROM contractor_profiles WHERE user_id=?", (u["id"],)).fetchone()
            else:
                p = c.execute("SELECT lat, lng FROM jobs WHERE customer_id=? AND lat IS NOT NULL ORDER BY id DESC LIMIT 1", (u["id"],)).fetchone()
            if p and p["lat"] is not None and p["lng"] is not None:
                w_lat, w_lng = p["lat"], p["lng"]
            else:
                raise HTTPException(400, "Location required to search contractors")
    check_latlng(w_lat, w_lng)
    r = clamp_radius(radius_km)
    la0, la1, ln0, ln1 = bbox(w_lat, w_lng, r)
    with db() as c:
        if lat is not None and lng is not None:
            rows = c.execute("SELECT u.id,u.name,cp.* FROM users u JOIN contractor_profiles cp ON cp.user_id=u.id "
                             "WHERE cp.lat BETWEEN ? AND ? AND cp.lng BETWEEN ? AND ?", (la0, la1, ln0, ln1)).fetchall()
            if not rows and expand:
                rows = c.execute("SELECT u.id,u.name,cp.* FROM users u JOIN contractor_profiles cp ON cp.user_id=u.id").fetchall()
        else:
            rows = c.execute("SELECT u.id,u.name,cp.* FROM users u JOIN contractor_profiles cp ON cp.user_id=u.id").fetchall()
        out = []
        for x in rows:
            d = haversine_km(w_lat, w_lng, x["lat"], x["lng"]) if (x["lat"] is not None and x["lng"] is not None) else None
            if d is not None and (d > r or d > x["radius_km"]):
                continue
            if skill and f",{skill}," not in f",{x['skills']},":
                continue
            if (x["rating_avg"] or 0) < min_rating:
                continue
            crew = c.execute("SELECT COUNT(*) FROM crew_members WHERE contractor_id=? AND status='active'", (x["id"],)).fetchone()[0]
            out.append({"id": x["id"], "name": x["name"] or "Contractor", "company": x["company"], "skills": [s for s in (x["skills"] or "").split(",") if s],
                        "village": x["village"], "distance_km": round(d, 1) if d is not None else None, "rating_avg": round(x["rating_avg"] or 0, 1), "rating_count": x["rating_count"],
                        "verified": bool(x["verified"]), "experience_years": x["experience_years"], "min_budget": x["min_budget"], "about": x["about"], "crew_size": crew})
        
        # Fallback if distance check removed all results, but only if expand=True
        if not out and rows and expand:
            for x in rows:
                d = haversine_km(w_lat, w_lng, x["lat"], x["lng"]) if (x["lat"] is not None and x["lng"] is not None) else None
                if skill and f",{skill}," not in f",{x['skills']},":
                    continue
                crew = c.execute("SELECT COUNT(*) FROM crew_members WHERE contractor_id=? AND status='active'", (x["id"],)).fetchone()[0]
                out.append({"id": x["id"], "name": x["name"] or "Contractor", "company": x["company"], "skills": [s for s in (x["skills"] or "").split(",") if s],
                            "village": x["village"], "distance_km": round(d, 1) if d is not None else None, "rating_avg": round(x["rating_avg"] or 0, 1), "rating_count": x["rating_count"],
                            "verified": bool(x["verified"]), "experience_years": x["experience_years"], "min_budget": x["min_budget"], "about": x["about"], "crew_size": crew, "outside_radius": True})
    out.sort(key=(lambda z: (-z["rating_avg"], z["distance_km"] if z["distance_km"] is not None else 999)) if sort == "rating" else (lambda z: (-z["crew_size"], z["distance_km"] if z["distance_km"] is not None else 999)) if sort == "crew" else (lambda z: z["distance_km"] if z["distance_km"] is not None else 999))
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
@router.post("/api/contractor/crew/invite")
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
        await notify(invite_uid, {"type": "crew_invite", "crew_id": cid, "contractor": u["name"] or "Contractor"})
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
    await notify(wid, {"type": "crew_invite", "crew_id": cid, "contractor": u["name"] or "Contractor"})
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

class CrewAttendanceReq(BaseModel):
    present: bool
    project_id: Optional[int] = None

@router.post("/api/contractor/crew/{cid}/attendance")
def crew_attendance(cid: int, req: CrewAttendanceReq, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        own_crew(c, cid, u)
        t_str = today().isoformat()
        pid = req.project_id
        if pid:
            proj = c.execute("SELECT * FROM projects WHERE id=? AND contractor_id=?", (pid, u["id"])).fetchone()
            if not proj:
                raise HTTPException(404, "Project not found or not owned by you")
            assigned = c.execute("SELECT 1 FROM project_crew WHERE project_id=? AND crew_id=?", (pid, cid)).fetchone()
            if not assigned:
                raise HTTPException(400, "Crew member is not assigned to this project")
        else:
            prow = c.execute("SELECT pc.project_id FROM project_crew pc JOIN projects p ON p.id=pc.project_id WHERE pc.crew_id=? AND p.contractor_id=? AND p.status IN ('accepted','in_progress') ORDER BY p.id DESC", (cid, u["id"])).fetchone()
            pid = prow["project_id"] if prow else 0
        m = c.execute("SELECT daily_rate FROM crew_members WHERE id=?", (cid,)).fetchone()
        wage = (m["daily_rate"] if m else 0) if req.present else 0
        c.execute("INSERT OR REPLACE INTO attendance(project_id,crew_id,day,present,wage) VALUES(?,?,?,?,?)",
                  (pid, cid, t_str, 1 if req.present else 0, wage))
    return {"ok": True}

class CrewPaymentReq(BaseModel):
    amount: int = Field(..., gt=0, le=10_000_000)
    type: Optional[str] = "advance"
    kind: Optional[str] = None
    note: str = ""

@router.post("/api/contractor/crew/{cid}/payment")
def crew_payment(cid: int, req: CrewPaymentReq, u=Depends(current_user)):
    contractor_only(u)
    ptype = (req.type or req.kind or "advance").lower().strip()
    if ptype not in ("advance", "payment", "wage", "bonus"):
        raise HTTPException(400, "Payment type must be advance, payment, wage, or bonus")
    kind = "payment" if ptype in ("payment", "wage") else ("bonus" if ptype == "bonus" else "advance")
    with db() as c:
        own_crew(c, cid, u)
        c.execute("INSERT INTO ledger(contractor_id,crew_id,project_id,kind,amount,note,created_at) VALUES(?,?,NULL,?,?,?,?)",
                  (u["id"], cid, kind, req.amount, req.note, time.time()))
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
    await notify(m["contractor_id"], {"type": "crew_update", "crew_id": cid, "status": "active" if req.accept else "declined", "name": u["name"]})
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
    start_date: Optional[str] = None
    days: int = Field(1, ge=1, le=365)
    budget: Optional[int] = Field(0, ge=0, le=100_000_000)          # total budget offered by the customer
    total_budget: Optional[int] = Field(None, ge=0, le=100_000_000)
    workers_needed: int = Field(1, ge=1, le=200)

def project_party(c, pid, u):
    p = c.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
    if not p or u["id"] not in (p["customer_id"], p["contractor_id"]):
        raise HTTPException(404, "Project not found")
    return p

@router.post("/api/projects")
@router.post("/api/contractor/projects")
async def project_create(req: ProjectReq, u=Depends(current_user)):
    need_role(u, "customer")
    budget_val = req.budget if req.budget else (req.total_budget or 0)
    start_date_str = req.start_date if req.start_date else today().isoformat()
    try:
        if pdate(start_date_str) < today():
            start_date_str = today().isoformat()
    except Exception:
        start_date_str = today().isoformat()
    now = time.time()
    with db() as c:
        if not c.execute("SELECT 1 FROM users WHERE id=? AND role='contractor'", (req.contractor_id,)).fetchone():
            raise HTTPException(404, "Contractor not found")
        cur = c.execute("INSERT INTO projects(customer_id,contractor_id,title,description,address,lat,lng,skill,start_date,days,budget,workers_needed,offer_by,offer_rounds,created_at,updated_at) "
                        "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)",
                        (u["id"], req.contractor_id, req.title, req.description, req.address, req.lat, req.lng, req.skill, start_date_str, req.days, budget_val, req.workers_needed, u["id"], now, now))
        pid = cur.lastrowid
        c.execute("INSERT INTO offers(kind,ref_id,from_id,rate,days,note,created_at) VALUES('project',?,?,?,?,?,?)", (pid, u["id"], budget_val, req.days, "", now))
    firebase_sync.sync_project(pid)
    await notify(req.contractor_id, {"type": "project_new", "project_id": pid, "title": req.title, "customer": u["name"] or "Customer"})
    return {"id": pid}

@router.get("/api/projects/mine")
@router.get("/api/contractor/projects")
def projects_mine(u=Depends(current_user)):
    col = "contractor_id" if u["role"] == "contractor" else "customer_id"
    with db() as c:
        rows = c.execute(f"SELECT p.*,cu.name AS customer_name,cu.phone AS customer_phone,ku.name AS contractor_name,ku.phone AS contractor_phone FROM projects p JOIN users cu ON cu.id=p.customer_id JOIN users ku ON ku.id=p.contractor_id "
                         f"WHERE p.{col}=? ORDER BY p.created_at DESC LIMIT 100", (u["id"],)).fetchall()
        out = []
        for p in rows:
            d = dict(p)
            d["total_budget"] = d.get("budget", 0)
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
    await notify(p["customer_id"], {"type": "project_update", "project_id": pid, "status": "in_progress"})
    return {"ok": True}

@router.post("/api/projects/{pid}/complete")
async def project_complete(pid: int, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        p = project_party(c, pid, u)
        if p["contractor_id"] != u["id"] or p["status"] not in ("accepted", "in_progress"):
            raise HTTPException(400, "Cannot complete")
        c.execute("UPDATE projects SET status='completed',updated_at=? WHERE id=?", (time.time(), pid))
    await notify(p["customer_id"], {"type": "project_update", "project_id": pid, "status": "completed"})
    return {"ok": True}

@router.post("/api/projects/{pid}/cancel")
async def project_cancel(pid: int, u=Depends(current_user)):
    with db() as c:
        p = project_party(c, pid, u)
        if p["status"] not in ("requested", "accepted"):
            raise HTTPException(400, "Cannot cancel now")
        c.execute("UPDATE projects SET status='cancelled',updated_at=? WHERE id=?", (time.time(), pid))
    other = p["contractor_id"] if u["id"] == p["customer_id"] else p["customer_id"]
    await notify(other, {"type": "project_update", "project_id": pid, "status": "cancelled"})
    return {"ok": True}

class ProjectStatusReq(BaseModel):
    status: str

@router.post("/api/projects/{pid}/status")
@router.post("/api/contractor/projects/{pid}/status")
async def project_set_status(pid: int, req: ProjectStatusReq, u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        p = project_party(c, pid, u)
        if p["contractor_id"] != u["id"]:
            raise HTTPException(403, "Not your project")
        new_st = req.status.lower().strip()
        curr_st = p["status"]

        if curr_st == "requested":
            if new_st in ("accepted", "accept"):
                event_st = "accepted"
            elif new_st in ("rejected", "declined", "reject"):
                event_st = "rejected"
            elif new_st == "cancelled":
                event_st = "cancelled"
            else:
                raise HTTPException(400, f"Cannot transition project from requested to {new_st}")
        elif curr_st == "accepted":
            if new_st in ("active", "in_progress"):
                event_st = "in_progress"
            elif new_st == "cancelled":
                event_st = "cancelled"
            else:
                raise HTTPException(400, f"Cannot transition project from accepted to {new_st}")
        elif curr_st == "in_progress":
            if new_st == "completed":
                event_st = "completed"
            elif new_st == "cancelled":
                event_st = "cancelled"
            else:
                raise HTTPException(400, f"Cannot transition project from in_progress to {new_st}")
        else:
            raise HTTPException(400, f"Project is already {curr_st}")

        c.execute("UPDATE projects SET status=?,updated_at=? WHERE id=?", (event_st, time.time(), pid))
    firebase_sync.sync_project(pid)
    await notify(p["customer_id"], {"type": "project_update", "project_id": pid, "status": event_st})
    return {"ok": True, "status": event_st}

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
@router.post("/api/contractor/projects/{pid}/assign")
async def project_assign(pid: int, req: AssignReq, u=Depends(current_user)):
    contractor_only(u)
    to_notify = []
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
                to_notify.append(m["worker_id"])
    for wid in to_notify:
        await notify(wid, {"type": "crew_assigned", "project_id": pid, "title": p["title"], "start_date": p["start_date"]})
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

@router.get("/api/contractor/ledger")
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
            out.append({"crew_id": m["id"], "name": m["name"], "days": days, "days_worked": days, "earned": earned, "total_earned": earned, "advance": adv, "total_advance": adv, "paid": paid, "balance": earned - adv - paid})
    return {"ledger": out, "summary": out, "total_due": sum(x["balance"] for x in out)}

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

# ---------------------------------------------------------------- contractor job feed & conversion (D1)
@router.get("/api/contractor/jobs")
def contractor_jobs(radius_km: Optional[float] = None, lat: Optional[float] = None, lng: Optional[float] = None,
                    skill: Optional[str] = None, all_skills: bool = False, u=Depends(current_user)):
    """Open jobs for contractors matching contractor's skills within contractor's radius."""
    contractor_only(u)
    with db() as c:
        cp = c.execute("SELECT * FROM contractor_profiles WHERE user_id=?", (u["id"],)).fetchone()
        c_lat = lat if lat is not None else (cp["lat"] if cp else None)
        c_lng = lng if lng is not None else (cp["lng"] if cp else None)
        r = clamp_radius(radius_km if radius_km else (cp["radius_km"] if cp and cp["radius_km"] else 25))

        if c_lat is not None and c_lng is not None:
            la0, la1, ln0, ln1 = bbox(c_lat, c_lng, r)
            rows = c.execute("SELECT j.*,u.name AS customer_name,u.phone AS customer_phone FROM jobs j JOIN users u ON u.id=j.customer_id "
                             "WHERE j.status='open' AND j.lat BETWEEN ? AND ? AND j.lng BETWEEN ? AND ? "
                             "ORDER BY j.created_at DESC LIMIT 200", (la0, la1, ln0, ln1)).fetchall()
        else:
            rows = c.execute("SELECT j.*,u.name AS customer_name,u.phone AS customer_phone FROM jobs j JOIN users u ON u.id=j.customer_id "
                             "WHERE j.status='open' ORDER BY j.created_at DESC LIMIT 200").fetchall()

    out = []
    c_skills = {s.strip() for s in ((cp["skills"] if cp else "") or "").split(",") if s.strip()}
    for j in rows:
        d = haversine_km(c_lat, c_lng, j["lat"], j["lng"]) if (c_lat is not None and c_lng is not None and j["lat"] is not None and j["lng"] is not None) else None
        if d is not None and d > r:
            continue
        if skill and j["skill"] != skill:
            continue
        if c_skills and not all_skills and not skill and j["skill"] not in c_skills:
            continue
        cust_phone = j["customer_phone"] or ""
        masked_phone = ("XXXXXX" + cust_phone[-4:]) if len(cust_phone) >= 4 else ""
        out.append({
            "id": j["id"], "customer_id": j["customer_id"], "skill": j["skill"],
            "description": j["description"], "address": j["address"],
            "start_date": j["start_date"], "days": j["days"], "budget": j["budget"],
            "customer_name": j["customer_name"] or "Customer", "customer_phone": masked_phone,
            "distance_km": round(d, 1) if d is not None else None,
            "matches_skill": (not c_skills or j["skill"] in c_skills)
        })
    if any(x["distance_km"] is not None for x in out):
        out.sort(key=lambda x: (x["distance_km"] if x["distance_km"] is not None else 9999))
    return {"jobs": out, "radius_km": r}

class ContractorInterestReq(BaseModel):
    rate: Optional[int] = Field(0, ge=0)
    note: Optional[str] = Field("", max_length=200)

@router.post("/api/contractor/jobs/{job_id}/interest")
async def contractor_job_interest(job_id: int, req: ContractorInterestReq = ContractorInterestReq(), u=Depends(current_user)):
    contractor_only(u)
    with db() as c:
        j = c.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        if not j or j["status"] != "open":
            raise HTTPException(404, "Job not found or no longer open")
        c.execute("INSERT OR REPLACE INTO job_interests(job_id,worker_id,rate,created_at) VALUES(?,?,?,?)",
                  (job_id, u["id"], req.rate, time.time()))
    await notify(j["customer_id"], {
        "type": "job_interest", "job_id": job_id, "contractor": u["name"],
        "rate": req.rate, "role": "contractor"
    })
    return {"ok": True}

class ConvertProjectReq(BaseModel):
    contractor_id: int
    title: Optional[str] = None
    budget: Optional[int] = None
    days: Optional[int] = None

@router.post("/api/contractor/jobs/{job_id}/convert-project")
async def convert_job_to_project(job_id: int, req: ConvertProjectReq, u=Depends(current_user)):
    """Customer converts an open job into a project request assigned to an interested contractor."""
    need_role(u, "customer")
    now = time.time()
    with db() as c:
        j = c.execute("SELECT * FROM jobs WHERE id=? AND customer_id=?", (job_id, u["id"])).fetchone()
        if not j:
            raise HTTPException(404, "Job not found")
        contractor = c.execute("SELECT * FROM users WHERE id=? AND role='contractor'", (req.contractor_id,)).fetchone()
        if not contractor:
            raise HTTPException(404, "Contractor not found")

        title = req.title or (j["description"][:50] if j["description"] else f"{j['skill']} Project")
        budget_val = req.budget if req.budget is not None else (j["budget"] or 0)
        days_val = req.days if req.days is not None else (j["days"] or 1)

        cur = c.execute(
            "INSERT INTO projects(customer_id,contractor_id,title,description,address,lat,lng,skill,start_date,days,budget,workers_needed,offer_by,offer_rounds,created_at,updated_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?,1,?,?)",
            (u["id"], req.contractor_id, title, j["description"], j["address"], j["lat"], j["lng"], j["skill"], j["start_date"], days_val, budget_val, u["id"], now, now)
        )
        pid = cur.lastrowid
        c.execute("INSERT INTO offers(kind,ref_id,from_id,rate,days,note,created_at) VALUES('project',?,?,?,?,?,?)",
                  (pid, u["id"], budget_val, days_val, "", now))
        # Mark job assigned
        c.execute("UPDATE jobs SET status='assigned' WHERE id=?", (job_id,))
    firebase_sync.sync_project(pid)
    await notify(req.contractor_id, {
        "type": "project_new", "project_id": pid, "title": title, "customer": u["name"] or "Customer"
    })
    return {"id": pid, "project_id": pid, "job_id": job_id}

# ---------------------------------------------------------------- project payment milestones (D3)
class MilestoneItem(BaseModel):
    title: str = Field(..., max_length=120)
    amount: int = Field(..., ge=0)
    percentage: Optional[int] = Field(0, ge=0, le=100)
    due_date: Optional[str] = None

class CreateMilestonesReq(BaseModel):
    milestones: List[MilestoneItem]

@router.get("/api/projects/{pid}/milestones")
def project_milestones_list(pid: int, u=Depends(current_user)):
    with db() as c:
        project_party(c, pid, u)
        rows = c.execute("SELECT * FROM project_milestones WHERE project_id=? ORDER BY id ASC", (pid,)).fetchall()
    return {"milestones": [dict(r) for r in rows]}

@router.post("/api/projects/{pid}/milestones")
def project_milestones_create(pid: int, req: CreateMilestonesReq, u=Depends(current_user)):
    with db() as c:
        p = project_party(c, pid, u)
        if p["status"] in ("completed", "cancelled"):
            raise HTTPException(400, "Cannot edit milestones for closed project")
        c.execute("DELETE FROM project_milestones WHERE project_id=? AND status='pending'", (pid,))
        now = time.time()
        for m in req.milestones:
            c.execute(
                "INSERT INTO project_milestones(project_id,title,amount,percentage,status,due_date,created_at) VALUES(?,?,?,?,?,?,?)",
                (pid, m.title, m.amount, m.percentage or 0, "pending", m.due_date, now)
            )
        rows = c.execute("SELECT * FROM project_milestones WHERE project_id=? ORDER BY id ASC", (pid,)).fetchall()
    return {"ok": True, "milestones": [dict(r) for r in rows]}

class MilestoneStatusReq(BaseModel):
    status: str = Field(..., pattern="^(pending|paid|released)$")

@router.post("/api/projects/{pid}/milestones/{mid}/status")
async def project_milestone_update(pid: int, mid: int, req: MilestoneStatusReq, u=Depends(current_user)):
    with db() as c:
        p = project_party(c, pid, u)
        m = c.execute("SELECT * FROM project_milestones WHERE id=? AND project_id=?", (mid, pid)).fetchone()
        if not m:
            raise HTTPException(404, "Milestone not found")
        if req.status in ("paid", "released") and u["id"] != p["customer_id"]:
            raise HTTPException(403, "Only customer can mark milestone paid or released")
        c.execute("UPDATE project_milestones SET status=? WHERE id=?", (req.status, mid))
    other = p["contractor_id"] if u["id"] == p["customer_id"] else p["customer_id"]
    await notify(other, {
        "type": "project_update", "project_id": pid, "milestone_id": mid,
        "status": req.status, "title": m["title"]
    })
    return {"ok": True, "milestone_id": mid, "status": req.status}
