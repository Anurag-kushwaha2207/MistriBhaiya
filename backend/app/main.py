import asyncio, os, secrets, sys, threading, time
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import config, firebase_sync
from .calls import connect_call
from .db import db, init_db
from .geo import bbox, haversine_km
from .realtime import hub, notify
from .security import (
    current_user, hash_otp, make_token, new_otp, norm_phone, rate_limit,
    read_token, hash_password, verify_password, check_lockout, record_failure, clear_failures
)
from .sms import send_otp_sms
from .common import *   # shared helpers (SKILLS, effective_status, get_booking, ...)

DEFAULT_SECRET_KEYS = {"change-me-in-production", "mistribaiya-dev-secret-change-in-prod-xyz-987"}
if not config.DEV_MODE and config.SECRET_KEY in DEFAULT_SECRET_KEYS:
    logger.critical("FATAL: In production (DEV_MODE=0), SECRET_KEY must be configured with a secure secret! Exiting.")
    sys.exit(1)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: sync SQLite with Firebase and run instant sweeper loop
    firebase_sync.sync_all_from_db()
    sweeper_running = True
    async def loop():
        while sweeper_running:
            await asyncio.sleep(2)
            try:
                with db() as c:
                    for r in c.execute("SELECT id FROM instant_requests WHERE status='searching'").fetchall():
                        await advance_instant(c, r["id"])
            except Exception as e:
                logger.error("instant sweeper error: %s", e)
    sweeper_task = asyncio.create_task(loop())
    yield
    # Shutdown
    sweeper_running = False
    sweeper_task.cancel()

app = FastAPI(title="MistriBaiya API", version="0.1.0", lifespan=lifespan)

# Enable CORS for Firebase Hosting and trusted origins
DEFAULT_ALLOWED_ORIGINS = [
    "https://mistribhaiya-f5a94.web.app",
    "https://mistribhaiya-f5a94.firebaseapp.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
env_cors = os.getenv("CORS_ORIGINS", "")
if env_cors and env_cors != "*":
    cors_origins = [o.strip() for o in env_cors.split(",") if o.strip()]
elif config.DEV_MODE:
    cors_origins = ["*"]
else:
    cors_origins = DEFAULT_ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$" if not config.DEV_MODE else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()   # idempotent: creates tables if missing
threading.Thread(target=firebase_sync.restore_all_from_firestore, daemon=True).start()

# ---------------------------------------------------------------- models
class OtpReq(BaseModel):
    phone: str

class CheckPhoneReq(BaseModel):
    phone: str

class LoginPasswordReq(BaseModel):
    phone: str
    password: str

class ForgotPasswordReq(BaseModel):
    phone: str
    otp: str
    new_password: str

class VerifyReq(BaseModel):
    phone: str
    otp: str
    role: str = "customer"
    name: str = ""
    password: Optional[str] = None
    skills: Optional[List[str]] = None
    daily_rate: Optional[int] = None
    experience_years: Optional[int] = None
    village: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: Optional[float] = None
    company: Optional[str] = None
    min_budget: Optional[int] = None
    about: Optional[str] = None

class MeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=60)
    lang: Optional[str] = Field(None, pattern="^(hi|en|mr|gu|bn|ta|te|bho)$")
    avatar: Optional[str] = None

class ProfileUpdate(BaseModel):
    skills: List[str] = []
    daily_rate: int = Field(0, ge=0, le=100000)
    experience_years: int = Field(0, ge=0, le=60)
    village: str = Field("", max_length=80)
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: float = 6

class StatusReq(BaseModel):
    status: Optional[str] = Field(None, pattern="^(free|busy|offline)$")
    hours: Optional[float] = Field(None, gt=0, le=72)
    lat: Optional[float] = None
    lng: Optional[float] = None

class LocationReq(BaseModel):
    lat: float
    lng: float

class JobReq(BaseModel):
    skill: str
    description: str = Field("", max_length=500)
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: str = Field("", max_length=200)
    start_date: Optional[str] = None
    days: int = Field(1, ge=1, le=365)
    budget: int = Field(0, ge=0)

class BookingReq(BaseModel):
    worker_id: int
    skill: str
    start_date: Optional[str] = None
    days: int = Field(1, ge=1, le=365)
    note: str = Field("", max_length=300)
    address: str = Field("", max_length=200)
    lat: Optional[float] = None
    lng: Optional[float] = None
    job_id: Optional[int] = None
    agreed_rate: int = Field(0, ge=0)

class RespondReq(BaseModel):
    accept: bool

class RateReq(BaseModel):
    stars: Optional[int] = Field(None, ge=1, le=5)
    rating: Optional[int] = Field(None, ge=1, le=5)
    review: str = Field("", max_length=300)

    @property
    def star_count(self) -> int:
        return self.stars if self.stars is not None else (self.rating if self.rating is not None else 5)

class CallReq(BaseModel):
    worker_id: Optional[int] = None
    booking_id: Optional[int] = None

# ---------------------------------------------------------------- meta / auth
def ice_servers():
    s = [{"urls": [u.strip() for u in config.STUN_URLS.split(",") if u.strip()]}]
    if config.TURN_URL:
        s.append({"urls": [config.TURN_URL], "username": config.TURN_USER, "credential": config.TURN_PASS})
    return s

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.get("/api/meta")
def meta():
    return {"skills": [{"key": k, "hi": v[0], "en": v[1]} for k, v in SKILLS.items()],
            "default_radius_km": config.DEFAULT_RADIUS_KM, "max_radius_km": config.MAX_RADIUS_KM,
            "call_mode": config.CALL_PROVIDER, "ice_servers": ice_servers(),
            "instant_wave_seconds": config.INSTANT_WAVE_SECONDS, "assistant_langs": ["hi", "en", "mr", "gu", "bn", "ta", "te", "bho"],
            "require_start_otp": config.REQUIRE_START_OTP, "dev_mode": config.DEV_MODE}

@app.post("/api/auth/request-otp")
def request_otp(req: OtpReq):
    phone = norm_phone(req.phone)
    rate_limit("otp:" + phone, 5, 600)
    code = new_otp()
    with db() as c:
        c.execute("INSERT INTO otps(phone,code_hash,expires,attempts) VALUES(?,?,?,0) "
                  "ON CONFLICT(phone) DO UPDATE SET code_hash=excluded.code_hash, expires=excluded.expires, attempts=0",
                  (phone, hash_otp(phone, code), time.time() + 300))
    send_otp_sms(phone, code)
    out = {"ok": True}
    if config.DEV_MODE:
        out["dev_otp"] = code
    return out

@app.post("/api/auth/check-phone")
def check_phone(req: CheckPhoneReq):
    phone = norm_phone(req.phone)
    with db() as c:
        u = c.execute("SELECT id, name, role, phone, password_hash FROM users WHERE phone=?", (phone,)).fetchone()
    if not u:
        u = firebase_sync.restore_user_if_missing(phone)
    if u:
        return {
            "exists": True,
            "name": u["name"] or "",
            "role": u["role"],
            "has_password": bool(u["password_hash"]),
        }
    return {"exists": False}

def get_user_profile(c, u):
    prof = {}
    if u["role"] == "worker":
        wp = c.execute("SELECT * FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone()
        if wp:
            st = effective_status(wp, busy_ranges(c, [u["id"]])[u["id"]], today(), time.time())
            prof = {**worker_public(u, wp, st), "lat": wp["lat"], "lng": wp["lng"]}
    elif u["role"] == "contractor":
        cp = c.execute("SELECT * FROM contractor_profiles WHERE user_id=?", (u["id"],)).fetchone()
        prof = dict(cp) if cp else {}
    return prof

@app.post("/api/auth/login-password")
def login_password(req: LoginPasswordReq, request: Request):
    phone = norm_phone(req.phone)
    client_ip = request.client.host if request.client else "unknown"
    check_lockout("pw_fail:" + phone, 5, 900)
    check_lockout("pw_fail_ip:" + client_ip, 15, 900)
    rate_limit("pw:" + phone, 10, 300)
    with db() as c:
        u = c.execute("SELECT * FROM users WHERE phone=?", (phone,)).fetchone()
    if not u:
        u = firebase_sync.restore_user_if_missing(phone)
    if not u:
        raise HTTPException(404, "अकाउंट नहीं मिला। कृपया पहले रजिस्टर करें। (Account not found. Please register first.)")
    if not u["password_hash"]:
        raise HTTPException(400, "इस नंबर पर पासवर्ड सेट नहीं है। कृपया OTP से लॉगिन करें या 'पासवर्ड भूल गए' से नया पासवर्ड बनाएं।")
    if not verify_password(req.password, u["password_hash"]):
        record_failure("pw_fail:" + phone)
        record_failure("pw_fail_ip:" + client_ip)
        raise HTTPException(400, "गलत पासवर्ड (Incorrect password)")
    clear_failures("pw_fail:" + phone)
    with db() as c:
        prof = get_user_profile(c, u)
    return {"token": make_token(u["id"]), "user": user_public(dict(u)), "profile": prof}

@app.post("/api/auth/forgot-password")
@app.post("/api/auth/reset-password")
def forgot_password(req: ForgotPasswordReq):
    phone = norm_phone(req.phone)
    if not req.new_password or len(req.new_password.strip()) < 6:
        raise HTTPException(400, "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Password must be at least 6 characters)")
    with db() as c:
        o = c.execute("SELECT * FROM otps WHERE phone=?", (phone,)).fetchone()
        if not o or o["expires"] < time.time():
            raise HTTPException(400, "OTP expired. Request a new one.")
        if o["attempts"] >= 5:
            raise HTTPException(429, "Too many wrong attempts")
        if not secrets.compare_digest(o["code_hash"], hash_otp(phone, req.otp.strip())):
            c.execute("UPDATE otps SET attempts=attempts+1 WHERE phone=?", (phone,))
            c.commit()
            raise HTTPException(400, "गलत OTP (Wrong OTP)")
        c.execute("DELETE FROM otps WHERE phone=?", (phone,))
        u = c.execute("SELECT * FROM users WHERE phone=?", (phone,)).fetchone()
        if not u:
            u = firebase_sync.restore_user_if_missing(phone)
        if not u:
            raise HTTPException(404, "यह मोबाइल नंबर रजिस्टर नहीं है (User with this phone not found)")
        pw_hash = hash_password(req.new_password.strip())
        c.execute("UPDATE users SET password_hash=? WHERE id=?", (pw_hash, u["id"]))
        u = c.execute("SELECT * FROM users WHERE id=?", (u["id"],)).fetchone()
        prof = get_user_profile(c, u)
    firebase_sync.save_credential(phone, u["id"], pw_hash, u["name"], u["role"])
    firebase_sync.sync_user(u["id"])
    return {"token": make_token(u["id"]), "user": user_public(dict(u)), "profile": prof}

@app.post("/api/auth/verify")
@app.post("/api/auth/verify-otp")
def verify(req: VerifyReq):
    phone = norm_phone(req.phone)
    if req.role not in ("worker", "customer", "contractor"):
        raise HTTPException(400, "role must be worker, customer or contractor")
    if req.password and len(req.password.strip()) < 6:
        raise HTTPException(400, "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Password must be at least 6 characters)")
    with db() as c:
        o = c.execute("SELECT * FROM otps WHERE phone=?", (phone,)).fetchone()
        if not o or o["expires"] < time.time():
            raise HTTPException(400, "OTP expired. Request a new one.")
        if o["attempts"] >= 5:
            raise HTTPException(429, "Too many wrong attempts")
        if not secrets.compare_digest(o["code_hash"], hash_otp(phone, req.otp.strip())):
            c.execute("UPDATE otps SET attempts=attempts+1 WHERE phone=?", (phone,))
            c.commit()
            raise HTTPException(400, "Wrong OTP")
        c.execute("DELETE FROM otps WHERE phone=?", (phone,))
        u = c.execute("SELECT * FROM users WHERE phone=?", (phone,)).fetchone()
        if not u:
            u = firebase_sync.restore_user_if_missing(phone)
        pw_hash = ""
        if not u:
            pw_hash = hash_password(req.password.strip()) if req.password else ""
            cur = c.execute("INSERT INTO users(phone,name,role,password_hash,is_admin,created_at) VALUES(?,?,?,?,?,?)",
                            (phone, req.name.strip()[:60], req.role, pw_hash, 1 if phone in config.ADMIN_PHONES else 0, time.time()))
            uid = cur.lastrowid
            if req.role == "worker":
                if req.lat is None or req.lng is None:
                    raise HTTPException(400, "Location (lat, lng) is required for worker registration")
                check_latlng(req.lat, req.lng)
                skills_str = ",".join(req.skills) if req.skills else ""
                c.execute("INSERT INTO worker_profiles(user_id,skills,daily_rate,experience_years,village,lat,lng,radius_km) VALUES(?,?,?,?,?,?,?,?)",
                          (uid, skills_str, req.daily_rate or 0, req.experience_years or 0, req.village or "", req.lat, req.lng, req.radius_km or config.DEFAULT_RADIUS_KM))
            if req.role == "contractor":
                if req.lat is None or req.lng is None:
                    raise HTTPException(400, "Location (lat, lng) is required for contractor registration")
                check_latlng(req.lat, req.lng)
                skills_str = ",".join(req.skills) if req.skills else ""
                c.execute("INSERT INTO contractor_profiles(user_id,company,skills,village,lat,lng,radius_km,min_budget,experience_years,about) VALUES(?,?,?,?,?,?,?,?,?,?)",
                          (uid, req.company or "", skills_str, req.village or "", req.lat, req.lng, req.radius_km or 25, req.min_budget or 0, req.experience_years or 0, req.about or ""))
            u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        else:
            if req.password and not u["password_hash"]:
                pw_hash = hash_password(req.password.strip())
                c.execute("UPDATE users SET password_hash=? WHERE id=?", (pw_hash, u["id"]))
                u = c.execute("SELECT * FROM users WHERE id=?", (u["id"],)).fetchone()
            else:
                pw_hash = u["password_hash"] or ""
        prof = get_user_profile(c, u)
    u_dict = dict(u)
    final_pw = u_dict.get("password_hash") or pw_hash
    if final_pw:
        firebase_sync.save_credential(phone, u_dict["id"], final_pw, u_dict.get("name") or "", u_dict.get("role") or "customer")
    firebase_sync.sync_user(u_dict["id"])
    if u_dict.get("role") == "worker":
        firebase_sync.sync_worker_profile(u_dict["id"])
    elif u_dict.get("role") == "contractor":
        firebase_sync.sync_contractor_profile(u_dict["id"])
    return {"token": make_token(u_dict["id"]), "user": user_public(u_dict), "profile": prof}

@app.get("/api/me")
def me(u=Depends(current_user)):
    with db() as c:
        prof = get_user_profile(c, u)
    return {"user": user_public(u), "profile": prof}

@app.put("/api/me")
@app.put("/api/profile")
def update_me(req: MeUpdate, u=Depends(current_user)):
    with db() as c:
        if req.name is not None:
            c.execute("UPDATE users SET name=? WHERE id=?", (req.name.strip(), u["id"]))
        if req.lang is not None:
            c.execute("UPDATE users SET lang=? WHERE id=?", (req.lang, u["id"]))
        if req.avatar is not None:
            c.execute("UPDATE users SET avatar=? WHERE id=?", (req.avatar, u["id"]))
    u_dict = dict(u)
    if req.name is not None and u_dict.get("phone"):
        firebase_sync.save_credential(u_dict["phone"], u_dict["id"], u_dict.get("password_hash") or "", req.name.strip(), u_dict.get("role") or "customer")
    firebase_sync.sync_user(u_dict["id"])
    if u_dict.get("role") == "worker":
        firebase_sync.sync_worker_profile(u_dict["id"])
    elif u_dict.get("role") == "contractor":
        firebase_sync.sync_contractor_profile(u_dict["id"])
    return {"ok": True, "name": req.name, "avatar": req.avatar}

class AvatarReq(BaseModel):
    avatar: Optional[str] = None

@app.post("/api/profile/avatar")
@app.put("/api/profile/avatar")
def update_avatar(req: AvatarReq, u=Depends(current_user)):
    with db() as c:
        c.execute("UPDATE users SET avatar=? WHERE id=?", (req.avatar or "", u["id"]))
    firebase_sync.sync_user(u["id"])
    return {"ok": True, "avatar": req.avatar}

@app.delete("/api/profile/avatar")
def delete_avatar(u=Depends(current_user)):
    with db() as c:
        c.execute("UPDATE users SET avatar=NULL WHERE id=?", (u["id"],))
    firebase_sync.sync_user(u["id"])
    return {"ok": True}

# ---------------------------------------------------------------- worker side
@app.put("/api/worker/profile")
async def worker_profile(req: ProfileUpdate, u=Depends(current_user)):
    need_role(u, "worker")
    skills = [s for s in req.skills if s in SKILLS]
    if not skills:
        raise HTTPException(400, "Choose at least one valid skill")
    with db() as c:
        wp = c.execute("SELECT * FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone()
        new_lat = req.lat if req.lat is not None else (wp["lat"] if wp and wp["lat"] is not None else None)
        new_lng = req.lng if req.lng is not None else (wp["lng"] if wp and wp["lng"] is not None else None)
        if new_lat is None or new_lng is None:
            raise HTTPException(400, "Location (lat, lng) is required for worker profile")
        check_latlng(new_lat, new_lng)
        c.execute("UPDATE worker_profiles SET skills=?,daily_rate=?,experience_years=?,village=?,lat=?,lng=?,radius_km=? WHERE user_id=?",
                  (",".join(skills), req.daily_rate, req.experience_years, req.village.strip(), new_lat, new_lng,
                   clamp_radius(req.radius_km), u["id"]))
        await push_worker_status(c, u["id"])
    firebase_sync.sync_worker_profile(u["id"])
    return {"ok": True, "profile": {"lat": new_lat, "lng": new_lng}}

@app.post("/api/worker/location")
@app.put("/api/worker/location")
async def worker_location(req: LocationReq, u=Depends(current_user)):
    need_role(u, "worker")
    check_latlng(req.lat, req.lng)
    with db() as c:
        c.execute("UPDATE worker_profiles SET lat=?,lng=? WHERE user_id=?", (req.lat, req.lng, u["id"]))
        await push_worker_status(c, u["id"])
    firebase_sync.sync_worker_profile(u["id"])
    return {"ok": True, "lat": req.lat, "lng": req.lng}

@app.post("/api/worker/status")
async def worker_status(req: StatusReq, u=Depends(current_user)):
    need_role(u, "worker")
    now = time.time()
    with db() as c:
        if req.lat is not None and req.lng is not None:
            check_latlng(req.lat, req.lng)
            c.execute("UPDATE worker_profiles SET lat=?,lng=? WHERE user_id=?", (req.lat, req.lng, u["id"]))
        wp = c.execute("SELECT * FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone()
        st = wp["status"] if wp else "offline"
        if req.status:
            cur_lat = wp["lat"] if wp else None
            cur_lng = wp["lng"] if wp else None
            if req.status == "free" and (cur_lat is None or cur_lng is None):
                raise HTTPException(400, "Location is required to set status to free")
            free_until = now + (req.hours or config.FREE_DEFAULT_HOURS) * 3600 if req.status == "free" else 0
            c.execute("UPDATE worker_profiles SET status=?,free_until=?,status_updated=? WHERE user_id=?",
                      (req.status, free_until, now, u["id"]))
            await push_worker_status(c, u["id"])
            st = effective_status(c.execute("SELECT * FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone(),
                                  busy_ranges(c, [u["id"]])[u["id"]], today(), now)
    firebase_sync.sync_worker_profile(u["id"])
    return {"ok": True, "status": st, "lat": wp["lat"] if wp else None, "lng": wp["lng"] if wp else None}

@app.get("/api/worker/jobs")
@app.get("/api/jobs")
def nearby_jobs(radius_km: Optional[float] = None, lat: Optional[float] = None, lng: Optional[float] = None,
                skill: Optional[str] = None, all_skills: bool = False, all_areas: bool = False, u=Depends(current_user)):
    """Open jobs around the worker, inside the worker's radius, matching skills."""
    with db() as c:
        wp = c.execute("SELECT * FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone() if u["role"] == "worker" else None
        w_lat = lat if lat is not None else (wp["lat"] if wp else None)
        w_lng = lng if lng is not None else (wp["lng"] if wp else None)
        r = clamp_radius(radius_km if radius_km else (wp["radius_km"] if wp and wp["radius_km"] else config.DEFAULT_RADIUS_KM))
        
        nearby_rows = []
        if w_lat is not None and w_lng is not None and not all_areas and (radius_km is None or radius_km < 90):
            la0, la1, ln0, ln1 = bbox(w_lat, w_lng, r)
            nearby_rows = c.execute("SELECT j.*,u.name AS customer_name,u.phone AS customer_phone FROM jobs j JOIN users u ON u.id=j.customer_id "
                             "WHERE j.status='open' AND j.lat BETWEEN ? AND ? AND j.lng BETWEEN ? AND ? "
                             "ORDER BY j.created_at DESC LIMIT 200", (la0, la1, ln0, ln1)).fetchall()
        
        if not nearby_rows:
            if all_areas:
                rows = c.execute("SELECT j.*,u.name AS customer_name,u.phone AS customer_phone FROM jobs j JOIN users u ON u.id=j.customer_id "
                                 "WHERE j.status='open' ORDER BY j.created_at DESC LIMIT 200").fetchall()
                using_fallback = True
            else:
                rows = []
                using_fallback = False
        else:
            rows = nearby_rows
            using_fallback = False

    out = []
    worker_skills = {s.strip() for s in ((wp["skills"] if wp else "") or "").split(",") if s.strip()}
    for j in rows:
        d = haversine_km(w_lat, w_lng, j["lat"], j["lng"]) if (w_lat is not None and w_lng is not None and j["lat"] is not None and j["lng"] is not None) else None
        if not using_fallback and d is not None and d > r:
            continue
        if skill and j["skill"] != skill:
            continue
        if worker_skills and not all_skills and not skill and j["skill"] not in worker_skills:
            continue
        cust_phone = j["customer_phone"] or ""
        masked_cust_phone = ("XXXXXX" + cust_phone[-4:]) if len(cust_phone) >= 4 else ""
        out.append({"id": j["id"], "customer_id": j["customer_id"], "skill": j["skill"], "description": j["description"], "address": j["address"],
                    "start_date": j["start_date"], "days": j["days"], "budget": j["budget"],
                    "customer_name": j["customer_name"] or "Customer", "customer_phone": masked_cust_phone,
                    "distance_km": round(d, 1) if d is not None else None,
                    "matches_skill": (not worker_skills or j["skill"] in worker_skills)})
    if any(x["distance_km"] is not None for x in out):
        out.sort(key=lambda x: (x["distance_km"] if x["distance_km"] is not None else 9999))
    return {"jobs": out, "radius_km": r}

# ---------------------------------------------------------------- customer side
@app.get("/api/workers")
@app.get("/api/workers/search")
def search_workers(lat: Optional[float] = None, lng: Optional[float] = None, radius_km: float = config.DEFAULT_RADIUS_KM, skill: str = "",
                   free_only: bool = False, on_date: str = "", date: str = "", sort: str = "smart", limit: int = Query(50, le=200),
                   respect_worker_radius: bool = True, expand: bool = False, u=Depends(current_user)):
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
                raise HTTPException(400, "Location required to search workers")
    check_latlng(w_lat, w_lng)
    r = clamp_radius(radius_km)
    d0 = pdate(target_date) if target_date else today()
    now = time.time()
    la0, la1, ln0, ln1 = bbox(w_lat, w_lng, r)
    sql = ("SELECT u.id,u.name,u.phone,wp.* FROM users u JOIN worker_profiles wp ON wp.user_id=u.id "
           "WHERE wp.lat BETWEEN ? AND ? AND wp.lng BETWEEN ? AND ? AND wp.skills!=''")
    args = [la0, la1, ln0, ln1]
    if skill:
        sql += " AND (',' || wp.skills || ',') LIKE ?"
        args.append(f"%,{skill},%")
    base_sql = "SELECT u.id,u.name,u.phone,wp.* FROM users u JOIN worker_profiles wp ON wp.user_id=u.id WHERE wp.skills!=''"
    base_args = []
    if skill:
        base_sql += " AND (',' || wp.skills || ',') LIKE ?"
        base_args.append(f"%,{skill},%")

    with db() as c:
        if lat is not None and lng is not None:
            rows = c.execute(sql, args).fetchall()
            if not rows and expand:
                rows = c.execute(base_sql, base_args).fetchall()
        else:
            rows = c.execute(base_sql, base_args).fetchall()
        ranges = busy_ranges(c, [x["id"] for x in rows])
    out = []
    for w in rows:
        d = haversine_km(w_lat, w_lng, w["lat"], w["lng"]) if (w["lat"] is not None and w["lng"] is not None) else None
        if d is not None and (d > r or (respect_worker_radius and d > w["radius_km"])):
            continue
        st = effective_status(w, ranges[w["id"]], d0, now)
        if free_only and st != "free":
            continue
        pub = worker_public(w, w, st, d)
        raw_phone = w["phone"] if "phone" in w.keys() else ""
        pub["phone"] = ("XXXXXX" + raw_phone[-4:]) if len(raw_phone) >= 4 else ""
        out.append(pub)

    # Graceful fallback: if no workers within strict radius, return all matching workers ONLY IF expand=True
    if not out and rows and expand:
        for w in rows:
            st = effective_status(w, ranges[w["id"]], d0, now)
            if free_only and st != "free":
                continue
            d = haversine_km(w_lat, w_lng, w["lat"], w["lng"]) if (w["lat"] is not None and w["lng"] is not None) else None
            pub = worker_public(w, w, st, d)
            raw_phone = w["phone"] if "phone" in w.keys() else ""
            pub["phone"] = ("XXXXXX" + raw_phone[-4:]) if len(raw_phone) >= 4 else ""
            pub["outside_radius"] = True
            out.append(pub)
    order = {"free": 0, "busy": 1, "offline": 2}
    if sort == "rating":
        out.sort(key=lambda x: (-x["rating_avg"], x["distance_km"] if x.get("distance_km") is not None else 999))
    elif sort == "rate":
        out.sort(key=lambda x: (x["daily_rate"] or 10**9, x["distance_km"] if x.get("distance_km") is not None else 999))
    elif sort == "distance":
        out.sort(key=lambda x: (x["distance_km"] if x.get("distance_km") is not None else 999))
    else:  # smart: free first, then nearest
        out.sort(key=lambda x: (order[x["status"]], x["distance_km"] if x.get("distance_km") is not None else 999))
    return {"workers": out[:limit], "radius_km": r, "count": len(out)}

@app.post("/api/jobs")
async def create_job(req: JobReq, u=Depends(current_user)):
    need_role(u, "customer")
    if req.skill not in SKILLS:
        raise HTTPException(400, "Unknown skill")
    
    # Coordinate fallback
    lat = req.lat
    lng = req.lng
    if lat is None or lng is None or lat == 0:
        with db() as c:
            prev = c.execute("SELECT lat, lng FROM jobs WHERE customer_id=? AND lat IS NOT NULL ORDER BY id DESC LIMIT 1", (u["id"],)).fetchone()
            if prev and prev["lat"] is not None and prev["lng"] is not None:
                lat, lng = prev["lat"], prev["lng"]
            else:
                raise HTTPException(400, "Location (lat, lng) is required to post a job")
    check_latlng(lat, lng)

    start_date = req.start_date if req.start_date else today().isoformat()
    try:
        if pdate(start_date) < today():
            start_date = today().isoformat()
    except Exception:
        start_date = today().isoformat()

    days = req.days if req.days and req.days >= 1 else 1
    budget = req.budget or 0
    now = time.time()

    with db() as c:
        cur = c.execute("INSERT INTO jobs(customer_id,skill,description,lat,lng,address,start_date,days,budget,created_at,status) VALUES(?,?,?,?,?,?,?,?,?,?,'open')",
                        (u["id"], req.skill, req.description, lat, lng, req.address, start_date, days, budget, now))
        jid = cur.lastrowid
        job_row = c.execute("SELECT j.*,u.name AS customer_name FROM jobs j JOIN users u ON u.id=j.customer_id WHERE j.id=?", (jid,)).fetchone()
        workers = c.execute("SELECT user_id, lat, lng, radius_km FROM worker_profiles WHERE lat IS NOT NULL AND lng IS NOT NULL AND (',' || skills || ',') LIKE ?",
                            (f"%,{req.skill},%",)).fetchall()
        contractors = c.execute("SELECT user_id, lat, lng, radius_km FROM contractor_profiles WHERE lat IS NOT NULL AND lng IS NOT NULL AND (',' || skills || ',') LIKE ?",
                                (f"%,{req.skill},%",)).fetchall()

    firebase_sync.sync_job(jid)

    # Targeted notifications (A7): workers and contractors with skill within radius
    job_radius = 50.0
    for w in workers:
        if w["user_id"] == u["id"]:
            continue
        d = haversine_km(lat, lng, w["lat"], w["lng"])
        max_d = min(job_radius, w["radius_km"] or config.DEFAULT_RADIUS_KM)
        if d <= max_d:
            await notify(w["user_id"], {
                "type": "job_new",
                "job_id": jid,
                "skill": req.skill,
                "customer": u["name"] or "Customer",
                "description": req.description,
                "budget": budget,
                "lat": lat,
                "lng": lng,
                "distance_km": round(d, 1)
            })

    for cp in contractors:
        if cp["user_id"] == u["id"]:
            continue
        d = haversine_km(lat, lng, cp["lat"], cp["lng"])
        max_d = min(job_radius, cp["radius_km"] or 25.0)
        if d <= max_d:
            await notify(cp["user_id"], {
                "type": "job_new",
                "job_id": jid,
                "skill": req.skill,
                "customer": u["name"] or "Customer",
                "description": req.description,
                "budget": budget,
                "lat": lat,
                "lng": lng,
                "distance_km": round(d, 1)
            })

    return {"id": jid, "job": dict(job_row) if job_row else {"id": jid}}

@app.get("/api/jobs/mine")
def my_jobs(u=Depends(current_user)):
    need_role(u, "customer")
    with db() as c:
        rows = c.execute("SELECT * FROM jobs WHERE customer_id=? ORDER BY created_at DESC LIMIT 100", (u["id"],)).fetchall()
    return {"jobs": [dict(r) for r in rows]}


class InterestReq(BaseModel):
    rate: int = Field(0, ge=0, le=100000)      # worker's quoted daily rate for this job (0 = use profile rate)

@app.post("/api/jobs/{job_id}/interest")
async def job_interest(job_id: int, req: Optional[InterestReq] = None, u=Depends(current_user)):
    """Worker says 'I can do this job'. The customer is notified and can then book / call the worker."""
    need_role(u, "worker")
    with db() as c:
        j = c.execute("SELECT * FROM jobs WHERE id=? AND status='open'", (job_id,)).fetchone()
        if not j:
            raise HTTPException(404, "Job not available")
        wp = c.execute("SELECT * FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone()
        quote = (req.rate if req and req.rate else (wp["daily_rate"] if wp and wp["daily_rate"] else 500))
        c.execute("INSERT OR REPLACE INTO job_interests(job_id,worker_id,created_at,rate) VALUES(?,?,?,?)", (job_id, u["id"], time.time(), quote))
    await notify(j["customer_id"], {"type": "job_interest", "job_id": job_id, "worker": u["name"] or "Mistri", "worker_id": u["id"], "rate": quote})
    return {"ok": True}

@app.get("/api/jobs/{job_id}/interested")
def job_interested(job_id: int, u=Depends(current_user)):
    need_role(u, "customer")
    with db() as c:
        j = c.execute("SELECT * FROM jobs WHERE id=? AND customer_id=?", (job_id, u["id"])).fetchone()
        if not j:
            raise HTTPException(404, "Job not found")
        rows = c.execute("SELECT u.id,u.name,u.phone,wp.*,ji.rate AS quoted FROM job_interests ji JOIN users u ON u.id=ji.worker_id "
                         "JOIN worker_profiles wp ON wp.user_id=u.id WHERE ji.job_id=?", (job_id,)).fetchall()
        ranges = busy_ranges(c, [r["id"] for r in rows])
    out = []
    for r in rows:
        st = effective_status(r, ranges[r["id"]], pdate(j["start_date"]), time.time())
        dist = haversine_km(j["lat"], j["lng"], r["lat"], r["lng"]) if (j["lat"] is not None and j["lng"] is not None and r["lat"] is not None and r["lng"] is not None) else None
        pub = {**worker_public(r, r, st, dist), "quoted_rate": r["quoted"], "phone": r["phone"] if "phone" in r.keys() else ""}
        out.append(pub)
    return {"workers": out}

@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: int, u=Depends(current_user)):
    with db() as c:
        j = c.execute("SELECT * FROM jobs WHERE id=? AND customer_id=?", (job_id, u["id"])).fetchone()
        if not j:
            raise HTTPException(404, "Job not found")
        c.execute("UPDATE jobs SET status='cancelled' WHERE id=?", (job_id,))
    return {"ok": True}

# ---------------------------------------------------------------- bookings
@app.post("/api/bookings")
async def create_booking(req: BookingReq, u=Depends(current_user)):
    need_role(u, "customer")
    if req.skill not in SKILLS:
        raise HTTPException(400, "Unknown skill")
    start_date_str = req.start_date if req.start_date else today().isoformat()
    try:
        start = pdate(start_date_str)
        if start < today():
            start_date_str = today().isoformat()
            start = today()
    except Exception:
        start_date_str = today().isoformat()
        start = today()

    with db() as c:
        w = c.execute("SELECT u.id,u.name,wp.* FROM users u JOIN worker_profiles wp ON wp.user_id=u.id WHERE u.id=?", (req.worker_id,)).fetchone()
        if not w:
            raise HTTPException(404, "Worker not found")
        worker_skills = [s.strip() for s in (w["skills"] or "").split(",") if s.strip()]
        if req.skill not in worker_skills:
            raise HTTPException(400, f"Worker does not provide skill '{req.skill}'")
        if overlaps(busy_ranges(c, [w["id"]])[w["id"]], start, req.days):
            raise HTTPException(409, "Worker is already booked for these dates")
        now = time.time()
        if start == today():
            st = effective_status(w, busy_ranges(c, [w["id"]])[w["id"]], today(), now)
            if st == "busy":
                raise HTTPException(409, "Worker is currently busy")
            if st == "offline" and not hub.is_online(w["id"]):
                raise HTTPException(400, "Worker is offline today")

        # Check radius if coordinates available
        req_lat = req.lat
        req_lng = req.lng
        if req_lat is not None and req_lng is not None and w["lat"] is not None and w["lng"] is not None:
            dist = haversine_km(req_lat, req_lng, w["lat"], w["lng"])
            max_r = w["radius_km"] or config.DEFAULT_RADIUS_KM
            if dist > max_r:
                raise HTTPException(400, f"Worker only works within {max_r} km (distance is {round(dist, 1)} km)")

        first_rate = req.agreed_rate or w["daily_rate"]
        cur = c.execute("INSERT INTO bookings(job_id,customer_id,worker_id,skill,note,address,lat,lng,start_date,days,agreed_rate,created_at,updated_at) "
                        "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (req.job_id, u["id"], w["id"], req.skill, req.note, req.address, req.lat, req.lng,
                         start_date_str, req.days, first_rate, now, now))
        bid = cur.lastrowid
        c.execute("UPDATE bookings SET offer_by=?, offer_rounds=1 WHERE id=?", (u["id"], bid))
        c.execute("INSERT INTO offers(kind,ref_id,from_id,rate,days,note,created_at) VALUES('booking',?,?,?,?,?,?)", (bid, u["id"], first_rate, req.days, "", now))
        booking_row = dict(c.execute("SELECT * FROM bookings WHERE id=?", (bid,)).fetchone())
        booking_row["worker_name"] = w["name"] or "मिस्त्री"
        booking_row["customer_name"] = u["name"] or "ग्राहक"
    firebase_sync.sync_booking(bid)
    await notify(w["id"], {"type": "booking_new", "booking_id": bid, "customer": u["name"] or "Customer", "skill": req.skill})
    return {"id": bid, "booking": booking_row}

@app.get("/api/bookings/mine")
@app.get("/api/bookings")
def my_bookings(u=Depends(current_user)):
    if u["role"] == "contractor":
        return {"bookings": []}
    col = "worker_id" if u["role"] == "worker" else "customer_id"
    with db() as c:
        rows = c.execute(f"SELECT * FROM bookings WHERE {col}=? ORDER BY created_at DESC LIMIT 100", (u["id"],)).fetchall()
        ids = {x for r in rows for x in (r["worker_id"], r["customer_id"])}
        users_map = {}
        if ids:
            q = ",".join("?" * len(ids))
            users_map = {r["id"]: dict(r) for r in c.execute(f"SELECT id,name,phone,avatar FROM users WHERE id IN ({q})", list(ids))}
    out = []
    for r in rows:
        b = dict(r)
        w_user = users_map.get(b["worker_id"], {})
        c_user = users_map.get(b["customer_id"], {})
        is_confirmed = b["status"] in ("accepted", "started")
        w_phone = w_user.get("phone") or ""
        c_phone = c_user.get("phone") or ""
        if not is_confirmed:
            w_phone = ("XXXXXX" + w_phone[-4:]) if len(w_phone) >= 4 else ""
            c_phone = ("XXXXXX" + c_phone[-4:]) if len(c_phone) >= 4 else ""

        b["worker_name"] = w_user.get("name") or "मिस्त्री"
        b["worker_phone"] = w_phone
        b["worker_avatar"] = w_user.get("avatar") or ""
        b["customer_name"] = c_user.get("name") or "ग्राहक"
        b["customer_phone"] = c_phone
        b["customer_avatar"] = c_user.get("avatar") or ""

        # Map 'other' for ease of calling/chatting
        if u["role"] == "worker":
            b["other_name"] = b["customer_name"]
            b["other_phone"] = b["customer_phone"]
            b["other_avatar"] = b["customer_avatar"]
            b["other_id"] = b["customer_id"]
        else:
            b["other_name"] = b["worker_name"]
            b["other_phone"] = b["worker_phone"]
            b["other_avatar"] = b["worker_avatar"]
            b["other_id"] = b["worker_id"]

        # Ensure both agreed_rate and daily_rate are present
        b["daily_rate"] = b["agreed_rate"] or 0

        if u["role"] == "worker" or b["status"] != "accepted" or b.get("started_at"):
            b["start_otp"] = ""
        out.append(b)
    return {"bookings": out}

@app.post("/api/bookings/{bid}/respond")
async def respond(bid: int, req: RespondReq, u=Depends(current_user)):
    need_role(u, "worker")
    rejected_workers = []
    with db() as c:
        b = get_booking(c, bid, u)
        if b["worker_id"] != u["id"] or b["status"] != "requested":
            raise HTTPException(400, "Cannot respond to this booking")
        if req.accept and b["offer_by"] == u["id"]:
            raise HTTPException(400, "Wait for the customer to accept your counter-offer")
        if req.accept:
            if overlaps(busy_ranges(c, [u["id"]])[u["id"]], pdate(b["start_date"]), b["days"]):
                raise HTTPException(409, "You already have a booking on these dates")
            set_booking(c, bid, "accepted")
            c.execute("UPDATE bookings SET start_otp=? WHERE id=?", (f"{secrets.randbelow(9000) + 1000}", bid))
            if b["job_id"]:
                c.execute("UPDATE jobs SET status='assigned' WHERE id=?", (b["job_id"],))
                pending = c.execute("SELECT id, worker_id FROM bookings WHERE job_id=? AND id!=? AND status='requested'", (b["job_id"], bid)).fetchall()
                for op in pending:
                    set_booking(c, op["id"], "rejected")
                    rejected_workers.append((op["id"], op["worker_id"]))
        else:
            set_booking(c, bid, "rejected")
        await push_worker_status(c, u["id"])
    firebase_sync.sync_booking(bid)
    firebase_sync.sync_worker_profile(u["id"])
    for op_id, op_wid in rejected_workers:
        firebase_sync.sync_booking(op_id)
        await notify(op_wid, {"type": "booking_update", "booking_id": op_id, "status": "rejected", "reason": "job_assigned"})
    await notify(b["customer_id"], {"type": "booking_update", "booking_id": bid, "status": "accepted" if req.accept else "rejected"})
    return {"ok": True}

@app.post("/api/bookings/{bid}/complete")
async def complete(bid: int, u=Depends(current_user)):
    with db() as c:
        b = get_booking(c, bid, u)
        if b["status"] not in ("accepted", "work_done"):
            raise HTTPException(400, "Only accepted or work_done bookings can be completed")
        if config.REQUIRE_START_OTP and not b["started_at"]:
            raise HTTPException(400, "Start the work first (worker enters the customer's OTP)")

        if u["id"] == b["worker_id"]:
            # Worker marks work done, awaiting customer confirmation
            set_booking(c, bid, "work_done")
            event_st = "work_done"
            text_msg = "मिस्त्री ने काम पूरा चिह्नित किया है। कृपया पुष्टि करें।"
        else:
            # Customer confirms completion
            set_booking(c, bid, "completed")
            if b["job_id"]:
                c.execute("UPDATE jobs SET status='done' WHERE id=?", (b["job_id"],))
            await push_worker_status(c, b["worker_id"])
            event_st = "completed"
            text_msg = "ग्राहक ने काम पूरा होने की पुष्टि कर दी है।"
            # Auto-release held escrow payment if exists
            held_pay = c.execute("SELECT id, net_paise, worker_id FROM payments WHERE booking_id=? AND status='held'", (bid,)).fetchone()
            if held_pay:
                c.execute("UPDATE payments SET status='released', updated_at=? WHERE id=?", (time.time(), held_pay["id"]))
                c.execute("INSERT INTO payouts(user_id, payment_id, amount_paise, status, created_at) VALUES(?,?,?,'pending',?)",
                          (held_pay["worker_id"], held_pay["id"], held_pay["net_paise"], time.time()))

    firebase_sync.sync_booking(bid)
    if event_st == "completed":
        firebase_sync.sync_worker_profile(b["worker_id"])
    other = b["worker_id"] if u["id"] == b["customer_id"] else b["customer_id"]
    await notify(other, {"type": "booking_update", "booking_id": bid, "status": event_st, "text": text_msg})
    return {"ok": True, "status": event_st}

@app.post("/api/bookings/{bid}/cancel")
async def cancel(bid: int, u=Depends(current_user)):
    with db() as c:
        b = get_booking(c, bid, u)
        if b["status"] not in ("requested", "accepted"):
            raise HTTPException(400, "Cannot cancel")
        set_booking(c, bid, "cancelled")
        await push_worker_status(c, b["worker_id"])
    firebase_sync.sync_booking(bid)
    firebase_sync.sync_worker_profile(b["worker_id"])
    other = b["worker_id"] if u["id"] == b["customer_id"] else b["customer_id"]
    await notify(other, {"type": "booking_update", "booking_id": bid, "status": "cancelled"})
    return {"ok": True}

class BookingStatusReq(BaseModel):
    status: str

@app.post("/api/bookings/{bid}/status")
async def update_booking_status(bid: int, req: BookingStatusReq, u=Depends(current_user)):
    st = req.status.lower().strip()
    if st == "accepted":
        return await respond(bid, RespondReq(accept=True), u)
    elif st == "rejected":
        return await respond(bid, RespondReq(accept=False), u)
    elif st == "completed":
        return await complete(bid, u)
    elif st == "cancelled":
        return await cancel(bid, u)
    raise HTTPException(400, "Invalid status")

@app.post("/api/bookings/{bid}/rate")
def rate(bid: int, req: RateReq, u=Depends(current_user)):
    need_role(u, "customer")
    star_val = req.star_count
    with db() as c:
        b = get_booking(c, bid, u)
        if b["customer_id"] != u["id"] or b["status"] != "completed" or b["rating"]:
            raise HTTPException(400, "Cannot rate this booking")
        c.execute("UPDATE bookings SET rating=?,review=? WHERE id=?", (star_val, req.review, bid))
        c.execute("UPDATE worker_profiles SET rating_avg=(rating_avg*rating_count+?)/(rating_count+1), rating_count=rating_count+1 WHERE user_id=?",
                  (star_val, b["worker_id"]))
    firebase_sync.sync_booking(bid)
    firebase_sync.sync_worker_profile(b["worker_id"])
    return {"ok": True}

# ---------------------------------------------------------------- calling
@app.post("/api/calls/connect")
def call(req: CallReq, u=Depends(current_user)):
    rate_limit(f"call:{u['id']}", 20, 3600)
    with db() as c:
        if req.booking_id:
            b = get_booking(c, req.booking_id, u)
            if b["status"] not in ("requested", "accepted"):
                raise HTTPException(400, "Booking is not active")
            other_id = b["worker_id"] if u["id"] == b["customer_id"] else b["customer_id"]
        elif req.worker_id and u["role"] == "customer":
            other_id = req.worker_id
        else:
            raise HTTPException(400, "booking_id or worker_id required")
        other = c.execute("SELECT * FROM users WHERE id=?", (other_id,)).fetchone()
        if not other:
            raise HTTPException(404, "User not found")
        try:
            res = connect_call(u["phone"], other["phone"])
        except Exception as e:
            raise HTTPException(502, f"Call provider error: {e}")
        c.execute("INSERT INTO call_logs(caller_id,callee_id,booking_id,provider,provider_call_id,status,created_at) VALUES(?,?,?,?,?,?,?)",
                  (u["id"], other_id, req.booking_id, res["provider"], res.get("provider_call_id", ""), "initiated", time.time()))
    return res


# ---------------------------------------------------------------- start-of-work OTP (like a Rapido ride OTP)
class StartReq(BaseModel):
    otp: str

@app.post("/api/bookings/{bid}/start")
async def start_work(bid: int, req: StartReq, u=Depends(current_user)):
    need_role(u, "worker")
    rate_limit(f"start:{u['id']}", 10, 600)
    with db() as c:
        b = get_booking(c, bid, u)
        if b["worker_id"] != u["id"] or b["status"] != "accepted" or b["started_at"]:
            raise HTTPException(400, "Cannot start this booking")
        if not b["start_otp"] or req.otp.strip() != b["start_otp"]:
            raise HTTPException(400, "Wrong OTP")
        c.execute("UPDATE bookings SET started_at=?, updated_at=? WHERE id=?", (time.time(), time.time(), bid))
    firebase_sync.sync_booking(bid)
    await notify(b["customer_id"], {"type": "booking_update", "booking_id": bid, "status": "started"})
    return {"ok": True}

# ---------------------------------------------------------------- instant dispatch (Rapido-style "need a mistri NOW")
class InstantReq(BaseModel):
    skill: str
    lat: float
    lng: float
    radius_km: float = config.DEFAULT_RADIUS_KM
    days: int = Field(1, ge=1, le=30)
    note: str = Field("", max_length=300)
    address: str = Field("", max_length=200)

def instant_candidates(c, q, exclude):
    import logging
    logger = logging.getLogger("instant")
    r = q["radius_km"]
    la0, la1, ln0, ln1 = bbox(q["lat"], q["lng"], r)
    rows = c.execute("SELECT u.id,u.name,wp.* FROM users u JOIN worker_profiles wp ON wp.user_id=u.id "
                     "WHERE wp.lat IS NOT NULL AND wp.lng IS NOT NULL AND wp.lat BETWEEN ? AND ? AND wp.lng BETWEEN ? AND ? AND (',' || wp.skills || ',') LIKE ?",
                     (la0, la1, ln0, ln1, f"%,{q['skill']},%")).fetchall()
    ranges = busy_ranges(c, [x["id"] for x in rows])
    now, start, out = time.time(), today(), []
    skipped = {"excluded": 0, "radius": 0, "overlaps": 0, "busy": 0, "offline_inactive": 0}
    for w in rows:
        wid = w["id"]
        if wid in exclude:
            skipped["excluded"] += 1
            continue
        d = haversine_km(q["lat"], q["lng"], w["lat"], w["lng"])
        if d > r or d > (w["radius_km"] or 25):
            skipped["radius"] += 1
            continue
        if overlaps(ranges[wid], start, q["days"]):
            skipped["overlaps"] += 1
            continue
        st = effective_status(w, ranges[wid], start, now)
        if st == "busy":
            skipped["busy"] += 1
            continue
        if st == "free":
            out.append((d, w))
        elif st == "offline":
            recent_login = bool(w["status_updated"] and (now - w["status_updated"] < 86400))
            if hub.is_online(wid) or recent_login:
                out.append((d, w))
            else:
                skipped["offline_inactive"] += 1
        else:
            skipped["busy"] += 1

    out.sort(key=lambda x: (x[0], -(x[1]["rating_avg"] or 0)))      # nearest first, better rated wins ties
    rid_label = q["id"] if (q and hasattr(q, "keys") and "id" in q.keys()) else "unknown"
    logger.info(f"instant_candidates for request {rid_label}: found {len(out)} candidates, skipped: {skipped}")
    return out

async def dispatch_wave(c, rid, wave):
    q = c.execute("SELECT * FROM instant_requests WHERE id=?", (rid,)).fetchone()
    already = {r["worker_id"] for r in c.execute("SELECT worker_id FROM instant_offers WHERE request_id=?", (rid,))}
    cands = instant_candidates(c, q, already)[:config.INSTANT_WAVE_SIZE]
    now = time.time()
    c.execute("UPDATE instant_requests SET wave=?, wave_started=? WHERE id=?", (wave, now, rid))
    for d, w in cands:
        c.execute("INSERT OR IGNORE INTO instant_offers(request_id,worker_id,wave,distance_km,created_at) VALUES(?,?,?,?,?)",
                  (rid, w["id"], wave, round(d, 1), now))
    if not cands:
        pending = c.execute("SELECT COUNT(*) FROM instant_offers WHERE request_id=? AND status='sent'", (rid,)).fetchone()[0]
        if wave == 1 or pending == 0:
            c.execute("UPDATE instant_requests SET status='no_worker' WHERE id=?", (rid,))
            await notify(q["customer_id"], {"type": "instant_status", "request_id": rid, "status": "no_worker"}, c=c)
        return 0
    for d, w in cands:
        await notify(w["id"], {"type": "instant_offer", "request_id": rid, "skill": q["skill"], "distance_km": round(d, 1),
                               "days": q["days"], "note": q["note"], "rate": w["daily_rate"], "seconds": config.INSTANT_WAVE_SECONDS}, c=c)
    await notify(q["customer_id"], {"type": "instant_status", "request_id": rid, "status": "searching", "wave": wave, "offered": len(cands)}, c=c)
    return len(cands)

async def advance_instant(c, rid):
    """Moves a request to its next wave when the current wave expired or everybody declined. Safe to call any time."""
    q = c.execute("SELECT * FROM instant_requests WHERE id=?", (rid,)).fetchone()
    if not q or q["status"] != "searching":
        return q
    pending = c.execute("SELECT COUNT(*) FROM instant_offers WHERE request_id=? AND status='sent'", (rid,)).fetchone()[0]
    if pending == 0 or time.time() - q["wave_started"] >= config.INSTANT_WAVE_SECONDS:
        c.execute("UPDATE instant_offers SET status='expired' WHERE request_id=? AND status='sent'", (rid,))
        if q["wave"] >= config.INSTANT_MAX_WAVES:
            c.execute("UPDATE instant_requests SET status='no_worker' WHERE id=?", (rid,))
            await notify(q["customer_id"], {"type": "instant_status", "request_id": rid, "status": "no_worker"}, c=c)
        else:
            await dispatch_wave(c, rid, q["wave"] + 1)
    return c.execute("SELECT * FROM instant_requests WHERE id=?", (rid,)).fetchone()

@app.post("/api/instant")
@app.post("/api/instant/start")
async def instant_create(req: InstantReq, u=Depends(current_user)):
    need_role(u, "customer")
    check_latlng(req.lat, req.lng)
    skill = "rajmistri" if req.skill in ("mistri", "rajmistri") else req.skill
    if skill not in SKILLS:
        raise HTTPException(400, "Unknown skill")
    now = time.time()
    with db() as c:
        cur = c.execute("INSERT INTO instant_requests(customer_id,skill,note,address,lat,lng,radius_km,days,wave,wave_started,created_at) VALUES(?,?,?,?,?,?,?,?,1,?,?)",
                        (u["id"], skill, req.note, req.address, req.lat, req.lng, clamp_radius(req.radius_km), req.days, now, now))
        rid = cur.lastrowid
        offered = await dispatch_wave(c, rid, 1)
        status = c.execute("SELECT status FROM instant_requests WHERE id=?", (rid,)).fetchone()["status"]
    return {"id": rid, "status": status, "offered": offered}

@app.get("/api/instant/{rid}")
async def instant_status(rid: int, u=Depends(current_user)):
    with db() as c:
        q = c.execute("SELECT * FROM instant_requests WHERE id=? AND customer_id=?", (rid, u["id"])).fetchone()
        if not q:
            raise HTTPException(404, "Request not found")
        q = await advance_instant(c, rid)
        out = {"id": rid, "status": q["status"], "wave": q["wave"], "booking_id": q["booking_id"], "worker": None}
        if q["worker_id"]:
            w = c.execute("SELECT u.id,u.name,wp.* FROM users u JOIN worker_profiles wp ON wp.user_id=u.id WHERE u.id=?", (q["worker_id"],)).fetchone()
            out["worker"] = worker_public(w, w, "busy", haversine_km(q["lat"], q["lng"], w["lat"], w["lng"]))
    return out

@app.post("/api/instant/{rid}/accept")
@app.post("/api/instant/offers/{rid}/accept")
async def instant_accept(rid: int, u=Depends(current_user)):
    need_role(u, "worker")
    with db() as c:
        await advance_instant(c, rid)
        off = c.execute("SELECT * FROM instant_offers WHERE request_id=? AND worker_id=? AND status='sent'", (rid, u["id"])).fetchone()
        if not off:
            raise HTTPException(409, "Offer expired or already taken")
        q = c.execute("SELECT * FROM instant_requests WHERE id=?", (rid,)).fetchone()
        won = c.execute("UPDATE instant_requests SET status='matched', worker_id=? WHERE id=? AND status='searching'", (u["id"], rid)).rowcount
        if won != 1:
            raise HTTPException(409, "Offer expired or already taken")
        wp = c.execute("SELECT * FROM worker_profiles WHERE user_id=?", (u["id"],)).fetchone()
        now = time.time()
        cur = c.execute("INSERT INTO bookings(job_id,customer_id,worker_id,skill,note,address,lat,lng,start_date,days,agreed_rate,status,start_otp,instant_id,created_at,updated_at) "
                        "VALUES(NULL,?,?,?,?,?,?,?,?,?,?,'accepted',?,?,?,?)",
                        (q["customer_id"], u["id"], q["skill"], q["note"], q["address"], q["lat"], q["lng"], today().isoformat(),
                         q["days"], wp["daily_rate"], f"{secrets.randbelow(9000) + 1000}", rid, now, now))
        bid = cur.lastrowid
        c.execute("UPDATE instant_requests SET booking_id=? WHERE id=?", (bid, rid))
        others = [r["worker_id"] for r in c.execute("SELECT worker_id FROM instant_offers WHERE request_id=? AND worker_id!=?", (rid, u["id"]))]
        c.execute("UPDATE instant_offers SET status='accepted' WHERE request_id=? AND worker_id=?", (rid, u["id"]))
        c.execute("UPDATE instant_offers SET status='closed' WHERE request_id=? AND worker_id!=? AND status='sent'", (rid, u["id"]))
        await push_worker_status(c, u["id"])
        d = haversine_km(q["lat"], q["lng"], wp["lat"], wp["lng"])
        pub = worker_public(u, wp, "busy", d)
    firebase_sync.sync_booking(bid)
    firebase_sync.sync_worker_profile(u["id"])
    await notify(q["customer_id"], {"type": "instant_status", "request_id": rid, "status": "matched", "booking_id": bid, "worker": pub})
    for oid in others:
        await notify(oid, {"type": "instant_closed", "request_id": rid})
    return {"booking_id": bid}

@app.post("/api/instant/{rid}/decline")
@app.post("/api/instant/offers/{rid}/decline")
async def instant_decline(rid: int, u=Depends(current_user)):
    need_role(u, "worker")
    with db() as c:
        c.execute("UPDATE instant_offers SET status='declined' WHERE request_id=? AND worker_id=? AND status='sent'", (rid, u["id"]))
        await advance_instant(c, rid)
    return {"ok": True}

@app.post("/api/instant/{rid}/cancel")
async def instant_cancel(rid: int, u=Depends(current_user)):
    with db() as c:
        q = c.execute("SELECT * FROM instant_requests WHERE id=? AND customer_id=? AND status='searching'", (rid, u["id"])).fetchone()
        if not q:
            raise HTTPException(404, "Nothing to cancel")
        c.execute("UPDATE instant_requests SET status='cancelled' WHERE id=?", (rid,))
        ids = [r["worker_id"] for r in c.execute("SELECT worker_id FROM instant_offers WHERE request_id=? AND status='sent'", (rid,))]
        c.execute("UPDATE instant_offers SET status='closed' WHERE request_id=? AND status='sent'", (rid,))
    for oid in ids:
        await notify(oid, {"type": "instant_closed", "request_id": rid})
    await notify(u["id"], {"type": "instant_status", "request_id": rid, "status": "cancelled"})
    return {"ok": True}

# ---------------------------------------------------------------- safety: SOS + reports
class SosReq(BaseModel):
    booking_id: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class ReportReq(BaseModel):
    reported_id: int
    reason: str = Field(min_length=3, max_length=500)
    booking_id: Optional[int] = None

@app.post("/api/sos")
async def sos(req: SosReq, u=Depends(current_user)):
    rate_limit(f"sos:{u['id']}", 10, 3600)
    other = None
    with db() as c:
        if req.booking_id:
            b = get_booking(c, req.booking_id, u)
            other = b["worker_id"] if u["id"] == b["customer_id"] else b["customer_id"]
        c.execute("INSERT INTO sos_events(user_id,booking_id,lat,lng,created_at) VALUES(?,?,?,?,?)",
                  (u["id"], req.booking_id, req.lat, req.lng, time.time()))
        admins = [r["id"] for r in c.execute("SELECT id FROM users WHERE is_admin=1")]
    for aid in admins:
        await notify(aid, {"type": "sos_admin", "user": u["name"] or u["phone"], "booking_id": req.booking_id})
    if other:
        await notify(other, {"type": "sos", "booking_id": req.booking_id})
    return {"ok": True, "emergency_number": "112"}

@app.post("/api/reports")
def report(req: ReportReq, u=Depends(current_user)):
    rate_limit(f"report:{u['id']}", 10, 3600)
    with db() as c:
        if not c.execute("SELECT 1 FROM users WHERE id=?", (req.reported_id,)).fetchone():
            raise HTTPException(404, "User not found")
        c.execute("INSERT INTO reports(reporter_id,reported_id,booking_id,reason,created_at) VALUES(?,?,?,?,?)",
                  (u["id"], req.reported_id, req.booking_id, req.reason, time.time()))
    return {"ok": True}

# ---------------------------------------------------------------- worker earnings
@app.get("/api/worker/earnings")
def earnings(u=Depends(current_user)):
    need_role(u, "worker")
    month = datetime.now().strftime("%Y-%m")
    with db() as c:
        rows = c.execute("SELECT start_date,days,agreed_rate FROM bookings WHERE worker_id=? AND status='completed'", (u["id"],)).fetchall()
        upcoming = c.execute("SELECT COUNT(*) FROM bookings WHERE worker_id=? AND status='accepted'", (u["id"],)).fetchone()[0]
    total = sum(r["days"] * r["agreed_rate"] for r in rows)
    this_month = sum(r["days"] * r["agreed_rate"] for r in rows if r["start_date"].startswith(month))
    return {"jobs_done": len(rows), "days_worked": sum(r["days"] for r in rows), "total_earned": total,
            "this_month": this_month, "upcoming_jobs": upcoming}

# ---------------------------------------------------------------- admin
@app.get("/api/admin/stats")
def stats(u=Depends(current_user)):
    if not u["is_admin"]:
        raise HTTPException(403, "Admin only")
    now = time.time()
    with db() as c:
        one = lambda q, *a: c.execute(q, a).fetchone()[0]
        return {
            "workers": one("SELECT COUNT(*) FROM users WHERE role='worker'"),
            "customers": one("SELECT COUNT(*) FROM users WHERE role='customer'"),
            "workers_free_now": one("SELECT COUNT(*) FROM worker_profiles WHERE status='free' AND free_until>?", now),
            "open_jobs": one("SELECT COUNT(*) FROM jobs WHERE status='open'"),
            "bookings": {s: one("SELECT COUNT(*) FROM bookings WHERE status=?", s) for s in
                         ("requested", "accepted", "rejected", "completed", "cancelled")},
            "calls": one("SELECT COUNT(*) FROM call_logs"),
        }


def need_admin(u):
    if not u["is_admin"]:
        raise HTTPException(403, "Admin only")

@app.get("/api/admin/workers")
def admin_workers(u=Depends(current_user)):
    need_admin(u)
    with db() as c:
        rows = c.execute("SELECT u.id,u.name,u.phone,u.created_at,wp.skills,wp.village,wp.daily_rate,wp.status,wp.free_until,wp.rating_avg,wp.rating_count,wp.verified "
                         "FROM users u JOIN worker_profiles wp ON wp.user_id=u.id ORDER BY u.created_at DESC LIMIT 500").fetchall()
    now = time.time()
    return {"workers": [{**dict(r), "free_now": r["status"] == "free" and r["free_until"] > now} for r in rows]}

@app.get("/api/admin/bookings")
def admin_bookings(u=Depends(current_user)):
    need_admin(u)
    with db() as c:
        rows = c.execute("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500").fetchall()
    return {"bookings": [{k: v for k, v in dict(r).items() if k != "start_otp"} for r in rows]}

@app.get("/api/admin/safety")
def admin_safety(u=Depends(current_user)):
    need_admin(u)
    with db() as c:
        return {"reports": [dict(r) for r in c.execute("SELECT * FROM reports ORDER BY created_at DESC LIMIT 200")],
                "sos": [dict(r) for r in c.execute("SELECT * FROM sos_events ORDER BY created_at DESC LIMIT 200")]}

@app.post("/api/admin/workers/{wid}/verify")
def admin_verify(wid: int, u=Depends(current_user)):
    need_admin(u)
    with db() as c:
        c.execute("UPDATE worker_profiles SET verified=1 WHERE user_id=?", (wid,))
    return {"ok": True}

# ---------------------------------------------------------------- realtime
async def relay_rtc(ws, uid, msg):
    """In-app voice call signalling (WebRTC). Allows calling via booking_id, target_user_id, or phone."""
    bid = msg.get("booking_id")
    target_uid = msg.get("target_user_id")
    phone = msg.get("phone")
    data = msg.get("data") or {}
    other = None
    with db() as c:
        if bid:
            b = c.execute("SELECT * FROM bookings WHERE id=?", (bid,)).fetchone()
            if b and uid in (b["worker_id"], b["customer_id"]):
                other = b["worker_id"] if uid == b["customer_id"] else b["customer_id"]
        if not other and target_uid:
            u = c.execute("SELECT id FROM users WHERE id=?", (target_uid,)).fetchone()
            if u:
                other = u["id"]
        if not other and phone:
            p = norm_phone(str(phone))
            u = c.execute("SELECT id FROM users WHERE phone=?", (p,)).fetchone()
            if u:
                other = u["id"]
        if not other:
            return
        if data.get("kind") == "offer":
            c.execute("INSERT INTO call_logs(caller_id,callee_id,booking_id,provider,status,created_at) VALUES(?,?,?,?,?,?)",
                      (uid, other, bid, "webrtc", "initiated", time.time()))
    caller_user = None
    with db() as c:
        row = c.execute("SELECT name, phone FROM users WHERE id=?", (uid,)).fetchone()
        if row:
            caller_user = {"name": row["name"] or "Caller", "phone": row["phone"], "id": uid}
    sent = await hub.to_user(other, {
        "type": "rtc",
        "booking_id": bid,
        "from": uid,
        "caller": caller_user,
        "target_user_id": other,
        "data": data
    })
    if sent == 0 and data.get("kind") == "offer":
        await ws.send_json({"type": "rtc_unavailable", "booking_id": bid, "target_user_id": other})

class ReadNotifReq(BaseModel):
    id: Optional[int] = None

@app.get("/api/notifications")
def get_notifications(limit: int = 50, u=Depends(current_user)):
    with db() as c:
        rows = c.execute("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ?", (u["id"], limit)).fetchall()
        unread = c.execute("SELECT COUNT(*) FROM notifications WHERE user_id=? AND read=0", (u["id"],)).fetchone()[0]
    out = []
    for r in rows:
        payload = {}
        try:
            payload = json.loads(r["payload_json"])
        except Exception:
            pass
        out.append({
            "id": r["id"],
            "type": r["type"],
            "payload": payload,
            "created_at": r["created_at"],
            "read": bool(r["read"])
        })
    return {"notifications": out, "unread_count": unread}

@app.post("/api/notifications/read")
def read_notifications(req: Optional[ReadNotifReq] = None, u=Depends(current_user)):
    with db() as c:
        if req and req.id:
            c.execute("UPDATE notifications SET read=1 WHERE id=? AND user_id=?", (req.id, u["id"]))
        else:
            c.execute("UPDATE notifications SET read=1 WHERE user_id=?", (u["id"],))
    return {"ok": True}

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket, token: str = ""):
    uid = read_token(token)
    if not uid:
        await ws.close(code=4401)
        return
    await hub.add(ws, uid)
    try:
        while True:
            msg = await ws.receive_json()
            if msg.get("type") == "subscribe":
                try:
                    hub.subscribe(ws, {"lat": float(msg["lat"]), "lng": float(msg["lng"]),
                                       "radius_km": clamp_radius(msg.get("radius_km", config.DEFAULT_RADIUS_KM))})
                except Exception:
                    pass
            elif msg.get("type") == "ping":
                await ws.send_json({"type": "pong"})
            elif msg.get("type") == "rtc":
                await relay_rtc(ws, uid, msg)
    except WebSocketDisconnect:
        pass
    finally:
        hub.remove(ws)

from . import negotiation, contractor, assistant, payments       # feature routers
app.include_router(negotiation.router)
app.include_router(contractor.router)
app.include_router(assistant.router)
app.include_router(payments.router)

# ---------------------------------------------------------------- frontend (PWA)
FRONT = Path(os.getenv("FRONTEND_DIR", Path(__file__).resolve().parents[2] / "frontend"))
if FRONT.exists():
    @app.get("/sw.js")
    def sw():
        return FileResponse(FRONT / "sw.js", media_type="application/javascript")
    app.mount("/", StaticFiles(directory=str(FRONT), html=True), name="frontend")
