"""Firebase Firestore Sync Module for MistriBhaiya.
Automatically mirrors all users, profiles, jobs, bookings, and projects
into Firebase Firestore (Project: mistribhaiya-f5a94) in real-time.
"""

import asyncio
import json
import logging
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional

from . import config
from .db import db

logger = logging.getLogger("firebase_sync")

FIREBASE_PROJECT_ID = "mistribhaiya-f5a94"
FIRESTORE_BASE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"


def to_fs(val: Any) -> Dict[str, Any]:
    """Convert a Python value to Firestore REST API field format."""
    if val is None:
        return {"nullValue": None}
    if isinstance(val, bool):
        return {"booleanValue": val}
    if isinstance(val, int):
        return {"integerValue": str(val)}
    if isinstance(val, float):
        return {"doubleValue": float(val)}
    if isinstance(val, (list, tuple)):
        return {"arrayValue": {"values": [to_fs(x) for x in val]}}
    if isinstance(val, dict):
        return {"mapValue": {"fields": {k: to_fs(v) for k, v in val.items()}}}
    return {"stringValue": str(val)}


def dict_to_fs_fields(d: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a dictionary to Firestore fields."""
    return {k: to_fs(v) for k, v in d.items()}


def from_fs(field_val: Dict[str, Any]) -> Any:
    """Convert Firestore field back to Python value."""
    if not isinstance(field_val, dict):
        return field_val
    if "stringValue" in field_val:
        return field_val["stringValue"]
    if "integerValue" in field_val:
        return int(field_val["integerValue"])
    if "doubleValue" in field_val:
        return float(field_val["doubleValue"])
    if "booleanValue" in field_val:
        return bool(field_val["booleanValue"])
    if "nullValue" in field_val:
        return None
    if "arrayValue" in field_val:
        return [from_fs(x) for x in field_val["arrayValue"].get("values", [])]
    if "mapValue" in field_val:
        return {k: from_fs(v) for k, v in field_val["mapValue"].get("fields", {}).items()}
    return None


def fs_doc_to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a full Firestore document to Python dictionary."""
    fields = doc.get("fields", {})
    return {k: from_fs(v) for k, v in fields.items()}


def get_fs_doc(collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single document from Firestore. Returns None silently on 403/404 (rules disabled)."""
    try:
        url = f"{FIRESTORE_BASE_URL}/{collection}/{doc_id}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            doc = json.loads(resp.read().decode())
            return fs_doc_to_dict(doc)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403, 404):
            logger.debug("Firestore %s/%s: HTTP %s (rules disabled or not found)", collection, doc_id, e.code)
        else:
            logger.warning("Firestore %s/%s: HTTP %s", collection, doc_id, e.code)
        return None
    except Exception as e:
        logger.debug("Firestore get_fs_doc %s/%s: %s", collection, doc_id, e)
        return None


def save_credential(phone: str, user_id: int, password_hash: str, name: str, role: str, avatar: str = ""):
    """Store user credential in Firestore so it persists across container restarts."""
    data = {
        "phone": phone,
        "user_id": user_id,
        "password_hash": password_hash,
        "name": name,
        "role": role,
        "avatar": avatar or "",
        "updated_at": time.time(),
    }
    push_to_firebase("auth_credentials", str(phone), data)


def restore_user_if_missing(phone: str) -> Optional[dict]:
    """If user is not in local SQLite, checks Firestore auth_credentials and restores user + profile."""
    try:
        cred = get_fs_doc("auth_credentials", phone)
        if not cred or not cred.get("user_id"):
            return None
        uid = int(cred["user_id"])
        user_doc = get_fs_doc("users", str(uid)) or {}
        with db() as c:
            existing = c.execute("SELECT * FROM users WHERE phone=?", (phone,)).fetchone()
            is_admin_val = 1 if phone in config.ADMIN_PHONES else 0
            if not existing:
                # Prevent ID collision if uid is already taken by another phone
                colliding = c.execute("SELECT id FROM users WHERE id=?", (uid,)).fetchone()
                if colliding:
                    cur = c.execute(
                        "INSERT INTO users(phone, name, role, password_hash, is_admin, avatar, created_at) "
                        "VALUES(?,?,?,?,?,?,?)",
                        (
                            phone,
                            user_doc.get("name") or cred.get("name") or "",
                            cred.get("role") or user_doc.get("role") or "customer",
                            cred.get("password_hash") or "",
                            is_admin_val,
                            user_doc.get("avatar") or "",
                            user_doc.get("created_at") or time.time(),
                        ),
                    )
                    uid = cur.lastrowid
                else:
                    c.execute(
                        "INSERT INTO users(id, phone, name, role, password_hash, is_admin, avatar, created_at) "
                        "VALUES(?,?,?,?,?,?,?,?)",
                        (
                            uid,
                            phone,
                            user_doc.get("name") or cred.get("name") or "",
                            cred.get("role") or user_doc.get("role") or "customer",
                            cred.get("password_hash") or "",
                            is_admin_val,
                            user_doc.get("avatar") or "",
                            user_doc.get("created_at") or time.time(),
                        ),
                    )
            else:
                uid = existing["id"]
                # Admin privilege strictly verified against config.ADMIN_PHONES
                c.execute("UPDATE users SET is_admin=? WHERE id=?", (is_admin_val, uid))
                if cred.get("password_hash") and not existing["password_hash"]:
                    c.execute("UPDATE users SET password_hash=? WHERE id=?", (cred["password_hash"], existing["id"]))

            role = cred.get("role") or user_doc.get("role")
            if role == "worker":
                wp_doc = get_fs_doc("worker_profiles", str(uid))
                if wp_doc:
                    raw_skills = wp_doc.get("skills") or ""
                    skills_str = ",".join(raw_skills) if isinstance(raw_skills, (list, tuple)) else str(raw_skills)
                    c.execute(
                        "INSERT OR REPLACE INTO worker_profiles(user_id, skills, daily_rate, experience_years, village, lat, lng, radius_km) "
                        "VALUES(?,?,?,?,?,?,?,?)",
                        (
                            uid,
                            skills_str,
                            int(wp_doc.get("daily_rate") or 0),
                            int(wp_doc.get("experience_years") or 0),
                            str(wp_doc.get("village") or ""),
                            float(wp_doc["lat"]) if wp_doc.get("lat") is not None else None,
                            float(wp_doc["lng"]) if wp_doc.get("lng") is not None else None,
                            float(wp_doc.get("radius_km") or 10),
                        ),
                    )
            elif role == "contractor":
                cp_doc = get_fs_doc("contractor_profiles", str(uid))
                if cp_doc:
                    raw_skills = cp_doc.get("skills") or ""
                    skills_str = ",".join(raw_skills) if isinstance(raw_skills, (list, tuple)) else str(raw_skills)
                    c.execute(
                        "INSERT OR REPLACE INTO contractor_profiles(user_id, company, skills, village, lat, lng, radius_km, min_budget, experience_years, about) "
                        "VALUES(?,?,?,?,?,?,?,?,?,?)",
                        (
                            uid,
                            str(cp_doc.get("company") or ""),
                            skills_str,
                            str(cp_doc.get("village") or ""),
                            float(cp_doc["lat"]) if cp_doc.get("lat") is not None else None,
                            float(cp_doc["lng"]) if cp_doc.get("lng") is not None else None,
                            float(cp_doc.get("radius_km") or 25),
                            int(cp_doc.get("min_budget") or 0),
                            int(cp_doc.get("experience_years") or 0),
                            str(cp_doc.get("about") or ""),
                        ),
                    )
            u = c.execute("SELECT * FROM users WHERE phone=?", (phone,)).fetchone()
            return dict(u) if u else None
    except Exception as e:
        logger.debug("restore_user_if_missing %s: %s", phone, e)
        return None


def fetch_all_docs(collection_name: str) -> list:
    """Fetch all documents from a Firestore collection with pagination."""
    docs = []
    page_token = None
    while True:
        url = f"{FIRESTORE_BASE_URL}/{collection_name}?pageSize=300"
        if page_token:
            url += f"&pageToken={urllib.parse.quote(page_token)}"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode())
                for d in data.get("documents", []):
                    doc_id = d["name"].split("/")[-1]
                    doc_data = fs_doc_to_dict(d)
                    doc_data["_id"] = doc_id
                    docs.append(doc_data)
                page_token = data.get("nextPageToken")
                if not page_token:
                    break
        except Exception as e:
            logger.debug("fetch_all_docs %s: %s", collection_name, e)
            break
    return docs


def restore_all_from_firestore():
    """Background startup task: load all users, profiles, and bookings from Firestore into SQLite."""
    try:
        fs_users = fetch_all_docs("users")
        fs_workers = fetch_all_docs("worker_profiles")
        fs_contractors = fetch_all_docs("contractor_profiles")
        fs_bookings = fetch_all_docs("bookings")
        fs_creds = fetch_all_docs("auth_credentials")

        with db() as c:
            c.execute("PRAGMA foreign_keys=OFF")

            # 1. Restore Users
            for u in fs_users:
                uid = int(u["_id"]) if str(u["_id"]).isdigit() else None
                phone = str(u.get("phone") or "").strip()
                if not phone:
                    continue
                name = str(u.get("name") or "")
                role = str(u.get("role") or "worker")
                avatar = str(u.get("avatar") or "")
                created_at = float(u.get("created_at") or time.time())
                is_admin = 1 if phone == "9793807864" else 0

                existing = c.execute("SELECT id, is_admin FROM users WHERE phone=?", (phone,)).fetchone()
                if existing:
                    c.execute("UPDATE users SET name=?, role=?, avatar=CASE WHEN ? != '' THEN ? ELSE avatar END, is_admin=? WHERE phone=?",
                              (name, role, avatar, avatar, 1 if phone == "9793807864" else existing["is_admin"], phone))
                else:
                    if uid:
                        uid_taken = c.execute("SELECT id FROM users WHERE id=?", (uid,)).fetchone()
                        if uid_taken:
                            uid = None
                    if uid:
                        c.execute("INSERT OR IGNORE INTO users(id, phone, name, role, avatar, created_at, is_admin) VALUES(?,?,?,?,?,?,?)",
                                  (uid, phone, name, role, avatar, created_at, is_admin))
                    else:
                        c.execute("INSERT OR IGNORE INTO users(phone, name, role, avatar, created_at, is_admin) VALUES(?,?,?,?,?,?)",
                                  (phone, name, role, avatar, created_at, is_admin))

            # 2. Restore Passwords
            for cr in fs_creds:
                phone = str(cr.get("phone") or cr["_id"]).strip()
                pw = str(cr.get("password_hash") or "")
                if pw and phone:
                    c.execute("UPDATE users SET password_hash=? WHERE phone=?", (pw, phone))

            # Ensure admin password
            from .security import hash_password
            adm_hash = hash_password("admin123")
            c.execute("UPDATE users SET is_admin=1, password_hash=? WHERE phone='9793807864'", (adm_hash,))

            # 3. Restore Worker Profiles
            for wp in fs_workers:
                uid = int(wp["_id"]) if str(wp["_id"]).isdigit() else None
                if not uid:
                    continue
                user_row = c.execute("SELECT id FROM users WHERE id=?", (uid,)).fetchone()
                if not user_row:
                    continue

                raw_skills = wp.get("skills") or ""
                skills_str = ",".join(raw_skills) if isinstance(raw_skills, (list, tuple)) else str(raw_skills)
                daily_rate = int(wp.get("daily_rate") or 0)
                exp = int(wp.get("experience_years") or 0)
                village = str(wp.get("village") or "")
                lat = float(wp["lat"]) if wp.get("lat") is not None else None
                lng = float(wp["lng"]) if wp.get("lng") is not None else None
                radius_km = float(wp.get("radius_km") or 6)
                status = str(wp.get("status") or "offline")
                if status not in ("free", "busy", "offline"):
                    status = "offline"
                free_until = float(wp.get("free_until") or 0)
                rating_avg = float(wp.get("rating_avg") or 0)
                rating_count = int(wp.get("rating_count") or 0)
                verified = 1 if wp.get("verified") else 0

                c.execute("""
                    INSERT OR REPLACE INTO worker_profiles(user_id, skills, daily_rate, experience_years, village, lat, lng, radius_km, status, free_until, rating_avg, rating_count, verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (uid, skills_str, daily_rate, exp, village, lat, lng, radius_km, status, free_until, rating_avg, rating_count, verified))

            # 4. Restore Contractor Profiles
            for cp in fs_contractors:
                uid = int(cp["_id"]) if str(cp["_id"]).isdigit() else None
                if not uid:
                    continue
                user_row = c.execute("SELECT id FROM users WHERE id=?", (uid,)).fetchone()
                if not user_row:
                    continue

                raw_skills = cp.get("skills") or ""
                skills_str = ",".join(raw_skills) if isinstance(raw_skills, (list, tuple)) else str(raw_skills)
                c.execute("""
                    INSERT OR REPLACE INTO contractor_profiles(user_id, company, skills, village, lat, lng, radius_km, min_budget, experience_years, about)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    uid,
                    str(cp.get("company") or ""),
                    skills_str,
                    str(cp.get("village") or ""),
                    float(cp["lat"]) if cp.get("lat") is not None else None,
                    float(cp["lng"]) if cp.get("lng") is not None else None,
                    float(cp.get("radius_km") or 25),
                    int(cp.get("min_budget") or 0),
                    int(cp.get("experience_years") or 0),
                    str(cp.get("about") or "")
                ))

            # 5. Restore Bookings
            for b in fs_bookings:
                bid = int(b["_id"]) if str(b["_id"]).isdigit() else None
                if not bid:
                    continue
                cid = int(b.get("customer_id") or 0)
                wid = int(b.get("worker_id") or 0)
                skill = str(b.get("skill") or "")
                note = str(b.get("note") or "")
                address = str(b.get("address") or "")
                start_date = str(b.get("start_date") or "")
                days = int(b.get("days") or 1)
                agreed_rate = int(b.get("agreed_rate") or 0)
                status = str(b.get("status") or "requested")
                rating = int(b.get("rating") or 0) if b.get("rating") is not None else None
                review = str(b.get("review") or "")
                created_at = float(b.get("created_at") or 0)
                updated_at = float(b.get("updated_at") or created_at)

                c.execute("""
                    INSERT OR REPLACE INTO bookings(id, customer_id, worker_id, skill, note, address, start_date, days, agreed_rate, status, rating, review, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (bid, cid, wid, skill, note, address, start_date, days, agreed_rate, status, rating, review, created_at, updated_at))

            c.execute("PRAGMA foreign_keys=ON")
        logger.info("Restored all collections from Firestore successfully.")
    except Exception as e:
        logger.warning("Firestore restore skipped/error: %s", e)


def _write_doc_sync(collection: str, doc_id: str, data: Dict[str, Any]):
    """Sync single document to Firestore synchronously."""
    try:
        url = f"{FIRESTORE_BASE_URL}/{collection}/{doc_id}"
        payload = json.dumps({"fields": dict_to_fs_fields(data)}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="PATCH",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            logger.debug("Firestore %s/%s: HTTP %s (rules disabled — ignoring)", collection, doc_id, e.code)
        else:
            logger.warning("Firebase Firestore sync failed for %s/%s: HTTP %s", collection, doc_id, e.code)
        return None
    except Exception as e:
        logger.warning("Firebase Firestore sync failed for %s/%s: %s", collection, doc_id, e)
        return None


def push_to_firebase(collection: str, doc_id: str, data: Dict[str, Any]):
    """Push document to Firestore in a background thread so the main API response is not delayed."""
    threading.Thread(target=_write_doc_sync, args=(collection, str(doc_id), data), daemon=True).start()


def sync_user(user_id: int):
    """Sync a user record to Firestore."""
    try:
        with db() as c:
            u = c.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            if not u:
                return
            data = dict(u)
            data.pop("password_hash", None)
            # Make sure boolean is actual bool
            data["is_admin"] = bool(data.get("is_admin"))
            data["updated_at"] = time.time()
            push_to_firebase("users", str(user_id), data)
    except Exception as e:
        logger.warning("Error fetching user %s for sync: %s", user_id, e)


def sync_worker_profile(user_id: int):
    """Sync a worker profile to Firestore."""
    try:
        with db() as c:
            u = c.execute("SELECT name, phone FROM users WHERE id=?", (user_id,)).fetchone()
            wp = c.execute("SELECT * FROM worker_profiles WHERE user_id=?", (user_id,)).fetchone()
            if not wp:
                return
            data = dict(wp)
            data["user_name"] = u["name"] if u else ""
            data["user_phone"] = u["phone"] if u else ""
            data["skills"] = [s for s in (data.get("skills") or "").split(",") if s]
            data["verified"] = bool(data.get("verified"))
            data["updated_at"] = time.time()
            push_to_firebase("worker_profiles", str(user_id), data)
    except Exception as e:
        logger.warning("Error fetching worker_profile %s for sync: %s", user_id, e)


def sync_contractor_profile(user_id: int):
    """Sync contractor profile to Firestore."""
    try:
        with db() as c:
            u = c.execute("SELECT name, phone FROM users WHERE id=?", (user_id,)).fetchone()
            cp = c.execute("SELECT * FROM contractor_profiles WHERE user_id=?", (user_id,)).fetchone()
            if not cp:
                return
            data = dict(cp)
            data["user_name"] = u["name"] if u else ""
            data["user_phone"] = u["phone"] if u else ""
            data["skills"] = [s for s in (data.get("skills") or "").split(",") if s]
            data["verified"] = bool(data.get("verified"))
            data["updated_at"] = time.time()
            push_to_firebase("contractor_profiles", str(user_id), data)
    except Exception as e:
        logger.warning("Error fetching contractor_profile %s for sync: %s", user_id, e)


def sync_job(job_id: int):
    """Sync a job record to Firestore."""
    try:
        with db() as c:
            j = c.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
            if not j:
                return
            data = dict(j)
            data["updated_at"] = time.time()
            push_to_firebase("jobs", str(job_id), data)
    except Exception as e:
        logger.warning("Error fetching job %s for sync: %s", job_id, e)


def sync_booking(booking_id: int):
    """Sync a booking record to Firestore."""
    try:
        with db() as c:
            b = c.execute("SELECT * FROM bookings WHERE id=?", (booking_id,)).fetchone()
            if not b:
                return
            data = dict(b)
            push_to_firebase("bookings", str(booking_id), data)
    except Exception as e:
        logger.warning("Error fetching booking %s for sync: %s", booking_id, e)


def sync_project(project_id: int):
    """Sync a project record to Firestore."""
    try:
        with db() as c:
            p = c.execute("SELECT * FROM projects WHERE id=?", (project_id,)).fetchone()
            if not p:
                return
            data = dict(p)
            push_to_firebase("projects", str(project_id), data)
    except Exception as e:
        logger.warning("Error fetching project %s for sync: %s", project_id, e)


def sync_all_from_db():
    """Sync all existing users, profiles, jobs, bookings, and projects from local SQLite DB to Firebase Firestore."""
    def _run():
        try:
            with db() as c:
                # 1. Users
                for u in c.execute("SELECT * FROM users").fetchall():
                    d = dict(u)
                    d["is_admin"] = bool(d.get("is_admin"))
                    _write_doc_sync("users", str(d["id"]), d)

                # 2. Worker profiles
                for wp in c.execute("SELECT * FROM worker_profiles").fetchall():
                    d = dict(wp)
                    d["skills"] = [s for s in (d.get("skills") or "").split(",") if s]
                    d["verified"] = bool(d.get("verified"))
                    _write_doc_sync("worker_profiles", str(d["user_id"]), d)

                # 3. Contractor profiles
                for cp in c.execute("SELECT * FROM contractor_profiles").fetchall():
                    d = dict(cp)
                    d["skills"] = [s for s in (d.get("skills") or "").split(",") if s]
                    d["verified"] = bool(d.get("verified"))
                    _write_doc_sync("contractor_profiles", str(d["user_id"]), d)

                # 4. Jobs
                for j in c.execute("SELECT * FROM jobs").fetchall():
                    _write_doc_sync("jobs", str(j["id"]), dict(j))

                # 5. Bookings
                for b in c.execute("SELECT * FROM bookings").fetchall():
                    _write_doc_sync("bookings", str(b["id"]), dict(b))

                # 6. Projects
                for p in c.execute("SELECT * FROM projects").fetchall():
                    _write_doc_sync("projects", str(p["id"]), dict(p))

            logger.info("All DB records successfully synced to Firebase Firestore!")
        except Exception as e:
            logger.warning("Initial Firebase sync error: %s", e)

    threading.Thread(target=_run, daemon=True).start()

