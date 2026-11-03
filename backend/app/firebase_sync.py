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
from typing import Any, Dict

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

