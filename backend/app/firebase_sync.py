"""Firebase Firestore Sync Module for MistriBhaiya.
Automatically mirrors all users, profiles, jobs, bookings, and projects
into Firebase Firestore (Project: mistribhaiya-f5a94) in real-time.
"""

import asyncio
import json
import logging
import threading
import time
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
    """Fetch a single document from Firestore."""
    try:
        url = f"{FIRESTORE_BASE_URL}/{collection}/{doc_id}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            doc = json.loads(resp.read().decode())
            return fs_doc_to_dict(doc)
    except Exception:
        return None


def save_credential(phone: str, user_id: int, password_hash: str, name: str, role: str):
    """Store user credential in Firestore so it persists across container restarts."""
    data = {
        "phone": phone,
        "user_id": user_id,
        "password_hash": password_hash,
        "name": name,
        "role": role,
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
            if not existing:
                c.execute(
                    "INSERT INTO users(id, phone, name, role, password_hash, is_admin, avatar, created_at) "
                    "VALUES(?,?,?,?,?,?,?,?)",
                    (
                        uid,
                        phone,
                        user_doc.get("name") or cred.get("name") or "",
                        cred.get("role") or user_doc.get("role") or "customer",
                        cred.get("password_hash") or "",
                        1 if user_doc.get("is_admin") else 0,
                        user_doc.get("avatar") or "",
                        user_doc.get("created_at") or time.time(),
                    ),
                )
            else:
                if cred.get("password_hash") and not existing["password_hash"]:
                    c.execute("UPDATE users SET password_hash=? WHERE id=?", (cred["password_hash"], existing["id"]))

            role = cred.get("role") or user_doc.get("role")
            if role == "worker":
                wp_doc = get_fs_doc("worker_profiles", str(uid))
                if wp_doc:
                    c.execute(
                        "INSERT OR REPLACE INTO worker_profiles(user_id, skills, daily_rate, experience_years, village, lat, lng, radius_km) "
                        "VALUES(?,?,?,?,?,?,?,?)",
                        (
                            uid,
                            wp_doc.get("skills") or "",
                            wp_doc.get("daily_rate") or 0,
                            wp_doc.get("experience_years") or 0,
                            wp_doc.get("village") or "",
                            wp_doc.get("lat"),
                            wp_doc.get("lng"),
                            wp_doc.get("radius_km") or 10,
                        ),
                    )
            elif role == "contractor":
                cp_doc = get_fs_doc("contractor_profiles", str(uid))
                if cp_doc:
                    c.execute(
                        "INSERT OR REPLACE INTO contractor_profiles(user_id, company, skills, village, lat, lng, radius_km, min_budget, experience_years, about) "
                        "VALUES(?,?,?,?,?,?,?,?,?,?)",
                        (
                            uid,
                            cp_doc.get("company") or "",
                            cp_doc.get("skills") or "",
                            cp_doc.get("village") or "",
                            cp_doc.get("lat"),
                            cp_doc.get("lng"),
                            cp_doc.get("radius_km") or 25,
                            cp_doc.get("min_budget") or 0,
                            cp_doc.get("experience_years") or 0,
                            cp_doc.get("about") or "",
                        ),
                    )
            u = c.execute("SELECT * FROM users WHERE phone=?", (phone,)).fetchone()
            return dict(u) if u else None
    except Exception as e:
        logger.warning("Error restoring user %s from Firestore: %s", phone, e)
        return None


def restore_all_from_firestore():
    """Background startup task: load all users and profiles from Firestore into SQLite."""
    try:
        url = f"{FIRESTORE_BASE_URL}/auth_credentials?pageSize=200"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            for doc in data.get("documents", []):
                cred = fs_doc_to_dict(doc)
                phone = cred.get("phone")
                if phone:
                    restore_user_if_missing(phone)
        logger.info("Restored users from Firestore successfully.")
    except Exception as e:
        logger.info("Firestore restore on startup skipped: %s", e)


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

