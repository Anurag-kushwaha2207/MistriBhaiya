"""AI Calling Agent Module for MistriBhaiya.
Automated outbound calling to homeowners and matched workers with DTMF detection,
call bridging, and real-time Firebase Firestore synchronization.
Supports: Vapi AI, Exotel, Twilio, and Simulator (test runner).
"""

import json
import logging
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional
from fastapi import HTTPException

from . import config, firebase_sync
from .db import db
from .geo import haversine_km

logger = logging.getLogger("ai_calling")

SKILL_SYNONYMS = {
    "mason": {"mason", "rajmistri", "चिनाई", "राजमिस्त्री", "mistri"},
    "rajmistri": {"mason", "rajmistri", "चिनाई", "राजमिस्त्री", "mistri"},
    "labour": {"labour", "helper", "मजदूर", "लेबर", "मजदूर / हेल्पर"},
    "helper": {"labour", "helper", "मजदूर", "लेबर", "मजदूर / हेल्पर"},
    "electrician": {"electrician", "बिजली", "वायरिंग"},
    "plumber": {"plumber", "नल", "पाइप", "प्लम्बर"},
    "painter": {"painter", "रंगाई", "पुताई", "पेंटर"},
    "tiles": {"tiles", "मार्बल", "टाइल्स"},
    "pop": {"pop", "ceiling", "सीलिंग", "पीओपी"},
    "welder": {"welder", "वेल्डर", "लोहा"},
    "carpenter": {"carpenter", "बढ़ई", "लकड़ी"},
}

SKILL_NAMES_HI = {
    "mason": "राजमिस्त्री (चिनाई)",
    "painter": "पेंटर (रंगाई-पुताई)",
    "electrician": "इलेक्ट्रीशियन (बिजली)",
    "plumber": "प्लम्बर (नल-पाइप)",
    "tiles": "टाइल्स व मार्बल",
    "pop": "पीओपी व फॉल्स सीलिंग",
    "welder": "वेल्डर (लोहा-वेल्डिंग)",
    "labour": "मजदूर / हेल्पर",
    "carpenter": "बढ़ई (लकड़ी का काम)",
    "other": "कारीगर",
}

CALL_ACTIVE_STATUSES = {
    "initiated",
    "customer_ringing",
    "customer_answered",
    "customer_accepted",
    "worker_ringing",
    "worker_accepted",
    "connecting",
    "connected",
}


def get_skill_hindi(skill: str) -> str:
    return SKILL_NAMES_HI.get(skill.lower().strip(), skill or "कारीगरी")


def get_customer_prompt(worker_name: str, skill_hi: str, direction: str = "customer_first") -> str:
    if direction == "worker_first":
        return (
            f"Namaste! Aapne hamare Mistri App par ek kaam publish kiya tha. "
            f"Aapke kaam ke liye humne mistri {worker_name} ji ({skill_hi}) se baat ki hai, "
            f"aur woh aapse abhi baat karne ke liye bilkul taiyar hain. "
            f"Kya aap unse baat karna chahenge? "
            f"Connect hone ke liye kripya apne phone par 1 dabayein. Agar abhi baat nahi karna chahte, toh 2 dabayein."
        )
    return (
        f"Namaste! Aapne hamare Mistri App par ek kaam publish kiya tha. "
        f"Aapke ghar ke paas humein ek suitable mistri mila hai. "
        f"Unka naam {worker_name} hai aur woh {skill_hi} ka kaam karte hain. "
        f"Kya aap unse baat karna chahenge? "
        f"Agar aap {worker_name} ji se baat karna chahte hain, toh kripya apne phone par 1 dabayein. "
        f"Agar abhi baat nahi karna chahte, toh 2 dabayein."
    )


def get_worker_prompt(skill_hi: str) -> str:
    return (
        f"Namaste! Mistri App se call hai. "
        f"Ek customer aapse {skill_hi} ke kaam ke liye baat karna chahte hain. "
        f"Kya aap abhi baat karne ke liye available hain? Haan ke liye 1 dabayein."
    )


def initiate_ai_call(job_id: int, worker_id: int, direction: str = "customer_first") -> Dict[str, Any]:
    """Initiates an AI calling workflow:
    direction: 'customer_first' (calls Homeowner first) or 'worker_first' (calls Mistri first)
    1. Validates job & worker
    2. Prevents duplicate active calls
    3. Creates ai_calls record
    4. Syncs to Firebase Firestore
    5. Dispatches call to configured telephony provider
    """
    with db() as c:
        # 1. Fetch job and customer details
        job = c.execute(
            """
            SELECT j.*, u.name AS customer_name, u.phone AS customer_phone
            FROM jobs j
            JOIN users u ON u.id = j.customer_id
            WHERE j.id = ?
            """,
            (job_id,),
        ).fetchone()
        if not job:
            raise HTTPException(404, "Job request not found")

        # 2. Fetch worker details
        worker = c.execute(
            """
            SELECT u.id, u.name, u.phone, wp.skills, wp.daily_rate, wp.village
            FROM users u
            LEFT JOIN worker_profiles wp ON wp.user_id = u.id
            WHERE u.id = ?
            """,
            (worker_id,),
        ).fetchone()
        if not worker:
            raise HTTPException(404, "Worker not found")

        # 3. Check for duplicate active call for this job & worker
        active_call = c.execute(
            """
            SELECT id, status FROM ai_calls
            WHERE job_id = ? AND worker_id = ? AND status IN (
                'initiated', 'customer_ringing', 'customer_answered',
                'customer_accepted', 'worker_ringing', 'worker_answered',
                'worker_accepted', 'connecting', 'connected'
            )
            ORDER BY id DESC LIMIT 1
            """,
            (job_id, worker_id),
        ).fetchone()
        if active_call:
            raise HTTPException(
                409,
                f"इस काम व मिस्त्री के लिए पहले से कॉल जारी है (Call #{active_call['id']}, स्थिति: {active_call['status']})।",
            )

        now = time.time()
        skill_hi = get_skill_hindi(job["skill"])
        provider = config.AI_CALL_PROVIDER or "simulator"
        init_status = "worker_ringing" if direction == "worker_first" else "customer_ringing"

        # 4. Insert into ai_calls table
        cur = c.execute(
            """
            INSERT INTO ai_calls (
                job_id, customer_id, customer_name, customer_phone,
                worker_id, worker_name, worker_phone, skill,
                provider, status, direction, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job_id,
                job["customer_id"],
                job["customer_name"] or "Homeowner",
                job["customer_phone"],
                worker["id"],
                worker["name"] or "Worker",
                worker["phone"],
                job["skill"],
                provider,
                init_status,
                direction,
                now,
                now,
            ),
        )
        call_id = cur.lastrowid

        # Also log to generic call_logs for cross-history
        c.execute(
            """
            INSERT INTO call_logs (caller_id, callee_id, booking_id, provider, provider_call_id, status, created_at)
            VALUES (?, ?, NULL, ?, ?, 'initiated', ?)
            """,
            (job["customer_id"], worker["id"], f"ai:{provider}", f"ai-{call_id}", now),
        )

    # 5. Mirror to Firebase Firestore in real time
    firebase_sync.sync_ai_call(call_id)

    # 6. Dispatch to chosen telephony provider
    if direction == "worker_first":
        provider_info = _dispatch_worker_call(
            call_id=call_id,
            worker_phone=worker["phone"],
            skill_hi=skill_hi,
            provider=provider,
        )
        with db() as c:
            c.execute(
                "UPDATE ai_calls SET worker_call_id=?, updated_at=? WHERE id=?",
                (provider_info.get("call_id", f"ai-w-{call_id}"), time.time(), call_id),
            )
    else:
        provider_info = _dispatch_customer_call(
            call_id=call_id,
            customer_phone=job["customer_phone"],
            worker_name=worker["name"] or "Mistri",
            skill_hi=skill_hi,
            provider=provider,
        )
        with db() as c:
            c.execute(
                "UPDATE ai_calls SET provider_call_id=?, updated_at=? WHERE id=?",
                (provider_info.get("call_id", f"ai-{call_id}"), time.time(), call_id),
            )

    firebase_sync.sync_ai_call(call_id)

    return {
        "ok": True,
        "call_id": call_id,
        "status": init_status,
        "direction": direction,
        "provider": provider,
        "customer": {"name": job["customer_name"], "phone": job["customer_phone"]},
        "worker": {"name": worker["name"], "phone": worker["phone"]},
        "speech_prompt": get_customer_prompt(worker["name"] or "Mistri", skill_hi, direction=direction),
        "created_at": now,
    }


def auto_dispatch_ai_call_for_job(job_id: int, direction: str = "worker_first") -> Optional[Dict[str, Any]]:
    """Automatically finds the nearest FREE worker matching the job skill and initiates an AI call."""
    with db() as c:
        job = c.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job or job["status"] not in ("open", "in_progress"):
            return None

        # Check if an active call already exists
        active = c.execute("""
            SELECT id, status FROM ai_calls
            WHERE job_id = ? AND status IN (
                'initiated', 'customer_ringing', 'customer_answered',
                'customer_accepted', 'worker_ringing', 'worker_accepted',
                'connecting', 'connected'
            ) ORDER BY id DESC LIMIT 1
        """, (job_id,)).fetchone()
        if active:
            logger.info("Auto AI call skipped: Call #%s already active (%s) for Job #%s", active["id"], active["status"], job_id)
            return None

        skill = (job["skill"] or "").strip().lower()
        j_lat = job["lat"]
        j_lng = job["lng"]
        syns = SKILL_SYNONYMS.get(skill, {skill})

        # Fetch workers
        rows = c.execute("""
            SELECT u.id, u.name, u.phone, u.role,
                   wp.skills, wp.status, wp.daily_rate, wp.village,
                   wp.lat, wp.lng, wp.radius_km
            FROM users u
            JOIN worker_profiles wp ON wp.user_id = u.id
            WHERE u.role = 'worker' AND (u.is_deleted IS NULL OR u.is_deleted = 0)
        """).fetchall()

        matched_free = []
        for r in rows:
            w = dict(r)
            # Worker must be free!
            if (w.get("status") or "free") != "free":
                continue

            # Must match skill
            w_skills = set(s.strip().lower() for s in (w.get("skills") or "").split(",") if s.strip())
            if not syns.intersection(w_skills):
                continue

            dist = None
            if j_lat is not None and j_lng is not None and w.get("lat") is not None and w.get("lng") is not None:
                dist = haversine_km(j_lat, j_lng, w["lat"], w["lng"])

            w["distance_km"] = round(dist, 2) if dist is not None else None
            matched_free.append(w)

        # Fallback: if no worker with exact skill is free, try any free worker
        if not matched_free:
            all_free = []
            for r in rows:
                w = dict(r)
                if (w.get("status") or "free") == "free":
                    dist = None
                    if j_lat is not None and j_lng is not None and w.get("lat") is not None and w.get("lng") is not None:
                        dist = haversine_km(j_lat, j_lng, w["lat"], w["lng"])
                    w["distance_km"] = round(dist, 2) if dist is not None else None
                    all_free.append(w)
            if all_free:
                all_free.sort(key=lambda x: x["distance_km"] if x.get("distance_km") is not None else 9999)
                matched_free = [all_free[0]]

        if not matched_free:
            logger.info("Auto AI call: No free worker available for Job #%s", job_id)
            return None

        # Sort: nearest first
        matched_free.sort(key=lambda x: x["distance_km"] if x.get("distance_km") is not None else 9999)
        nearest = matched_free[0]
        dist_str = f"{nearest['distance_km']} km" if nearest.get('distance_km') is not None else "नजदीक"

        logger.info(
            "Auto-dispatching AI call for Job #%s to nearest free worker #%s (%s, %s)",
            job_id, nearest["id"], nearest["name"], dist_str
        )

    # Initiate call
    try:
        res = initiate_ai_call(job_id=job_id, worker_id=nearest["id"], direction=direction)
        res["auto_dispatched"] = True
        res["nearest_worker"] = nearest
        res["distance_str"] = dist_str

        # Update note in ai_calls record
        with db() as c:
            c.execute(
                "UPDATE ai_calls SET notes = ? WHERE id = ?",
                (f"⚡ ऑटो-कॉल: सबसे नजदीकी फ्री मिस्त्री {nearest['name']} ({dist_str}) को कॉल मिलाई गई", res["call_id"]),
            )
        firebase_sync.sync_ai_call(res["call_id"])
        return res
    except Exception as e:
        logger.error("Auto AI dispatch error for Job #%s: %s", job_id, e)
        return None


def _dispatch_customer_call(
    call_id: int, customer_phone: str, worker_name: str, skill_hi: str, provider: str
) -> Dict[str, Any]:
    """Dispatches leg 1 (customer call) via selected provider."""
    cust_speech = get_customer_prompt(worker_name, skill_hi)

    if provider == "sarvam" and config.SARVAM_API_KEY:
        try:
            return _call_sarvam_outbound(
                call_id=call_id,
                phone=customer_phone,
                prompt=cust_speech,
                leg="customer",
                extra_context={"worker_name": worker_name, "skill_hi": skill_hi},
            )
        except Exception as e:
            logger.error("Sarvam call customer error: %s. Falling back to simulator.", e)

    elif provider == "vapi" and config.VAPI_API_KEY:
        try:
            return _call_vapi_customer(call_id, customer_phone, cust_speech, worker_name, skill_hi)
        except Exception as e:
            logger.error("Vapi call error: %s. Falling back to simulator.", e)

    elif provider == "twilio" and config.TWILIO_ACCOUNT_SID:
        try:
            return _call_twilio_customer(call_id, customer_phone, cust_speech)
        except Exception as e:
            logger.error("Twilio call error: %s. Falling back to simulator.", e)

    elif provider == "exotel" and config.EXOTEL_API_KEY:
        try:
            return _call_exotel_customer(call_id, customer_phone)
        except Exception as e:
            logger.error("Exotel call error: %s. Falling back to simulator.", e)

    # Default / Simulator mode
    logger.info("Simulator initiated call #%s to Customer (%s)", call_id, customer_phone)
    return {"provider": "simulator", "call_id": f"sim-cust-{call_id}-{int(time.time())}"}


def handle_customer_dtmf(call_id: int, digit: str) -> Dict[str, Any]:
    """Processes customer DTMF input (1 = Accept, 2 = Decline)."""
    digit = str(digit).strip()
    now = time.time()

    with db() as c:
        call = c.execute("SELECT * FROM ai_calls WHERE id = ?", (call_id,)).fetchone()
        if not call:
            raise HTTPException(404, "Call session not found")

        is_worker_first = (call["direction"] if "direction" in call.keys() else "customer_first") == "worker_first"

        if digit == "1":
            if is_worker_first:
                c.execute(
                    "UPDATE ai_calls SET customer_keypad='1', status='connecting', updated_at=? WHERE id=?",
                    (now, call_id),
                )
                new_status = "connecting"
            else:
                c.execute(
                    """
                    UPDATE ai_calls
                    SET customer_keypad = '1',
                        status = 'customer_accepted',
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (now, call_id),
                )
                new_status = "customer_accepted"
        elif digit == "2":
            # Customer declined
            duration = int(now - call["created_at"])
            c.execute(
                """
                UPDATE ai_calls
                SET customer_keypad = '2',
                    status = 'customer_declined',
                    failure_reason = 'Customer declined connection',
                    duration_seconds = ?,
                    completed_at = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (duration, now, now, call_id),
            )
            new_status = "customer_declined"
        else:
            return {
                "ok": False,
                "message": "Invalid keypad input. Please press 1 to connect, or 2 to decline.",
                "status": call["status"],
            }

    firebase_sync.sync_ai_call(call_id)

    # If accepted, trigger next step
    if new_status == "customer_accepted":
        return trigger_worker_call(call_id)
    elif new_status == "connecting":
        return connect_call_bridge(call_id)

    return {"ok": True, "call_id": call_id, "status": new_status, "customer_keypad": digit}


def trigger_customer_call(call_id: int) -> Dict[str, Any]:
    """Triggers outbound call to Homeowner when Mistri is called first and presses 1."""
    now = time.time()
    with db() as c:
        call = c.execute("SELECT * FROM ai_calls WHERE id = ?", (call_id,)).fetchone()
        if not call:
            raise HTTPException(404, "Call not found")
        c.execute("UPDATE ai_calls SET status = 'customer_ringing', updated_at = ? WHERE id = ?", (now, call_id))
    firebase_sync.sync_ai_call(call_id)

    skill_hi = get_skill_hindi(call["skill"])
    cust_speech = get_customer_prompt(call["worker_name"] or "Mistri", skill_hi, direction="worker_first")
    provider = call["provider"] or "simulator"

    info = _dispatch_customer_call(
        call_id=call_id,
        customer_phone=call["customer_phone"],
        worker_name=call["worker_name"] or "Mistri",
        skill_hi=skill_hi,
        provider=provider,
    )
    with db() as c:
        c.execute("UPDATE ai_calls SET provider_call_id=?, updated_at=? WHERE id=?", (info.get("call_id", f"ai-c-{call_id}"), time.time(), call_id))
    firebase_sync.sync_ai_call(call_id)
    return {"ok": True, "call_id": call_id, "status": "customer_ringing", "speech": cust_speech}


def trigger_worker_call(call_id: int) -> Dict[str, Any]:
    """Leg 2: Initiates call to worker when homeowner presses 1."""
    now = time.time()
    with db() as c:
        call = c.execute("SELECT * FROM ai_calls WHERE id = ?", (call_id,)).fetchone()
        if not call:
            raise HTTPException(404, "Call not found")

        c.execute(
            "UPDATE ai_calls SET status = 'worker_ringing', updated_at = ? WHERE id = ?",
            (now, call_id),
        )

    firebase_sync.sync_ai_call(call_id)

    skill_hi = get_skill_hindi(call["skill"])
    worker_speech = get_worker_prompt(skill_hi)
    provider = call["provider"] or "simulator"

    worker_info = _dispatch_worker_call(
        call_id=call_id,
        worker_phone=call["worker_phone"],
        skill_hi=skill_hi,
        provider=provider,
    )

    with db() as c:
        c.execute(
            "UPDATE ai_calls SET worker_call_id=?, updated_at=? WHERE id=?",
            (worker_info.get("call_id", f"ai-w-{call_id}"), time.time(), call_id),
        )
    firebase_sync.sync_ai_call(call_id)

    return {
        "ok": True,
        "call_id": call_id,
        "status": "worker_ringing",
        "worker_phone": call["worker_phone"],
        "worker_speech": worker_speech,
    }


def _dispatch_worker_call(
    call_id: int, worker_phone: str, skill_hi: str, provider: str
) -> Dict[str, Any]:
    """Dispatches leg 2 (worker call) via chosen telephony provider."""
    worker_speech = get_worker_prompt(skill_hi)

    if provider == "sarvam" and config.SARVAM_API_KEY:
        try:
            return _call_sarvam_outbound(
                call_id=call_id,
                phone=worker_phone,
                prompt=worker_speech,
                leg="worker",
                extra_context={"skill_hi": skill_hi},
            )
        except Exception as e:
            logger.error("Sarvam worker call error: %s. Falling back to simulator.", e)

    elif provider == "vapi" and config.VAPI_API_KEY:
        try:
            return _call_vapi_worker(call_id, worker_phone, worker_speech, skill_hi)
        except Exception as e:
            logger.error("Vapi worker call error: %s", e)

    elif provider == "twilio" and config.TWILIO_ACCOUNT_SID:
        try:
            return _call_twilio_worker(call_id, worker_phone, worker_speech)
        except Exception as e:
            logger.error("Twilio worker call error: %s", e)

    logger.info("Simulator initiated call #%s to Worker (%s)", call_id, worker_phone)
    return {"provider": "simulator", "call_id": f"sim-work-{call_id}-{int(time.time())}"}


def handle_worker_dtmf(call_id: int, digit: str) -> Dict[str, Any]:
    """Processes worker DTMF input (1 = Accept, 2 = Decline)."""
    digit = str(digit).strip()
    now = time.time()

    with db() as c:
        call = c.execute("SELECT * FROM ai_calls WHERE id = ?", (call_id,)).fetchone()
        if not call:
            raise HTTPException(404, "Call session not found")

        is_worker_first = (call["direction"] if "direction" in call.keys() else "customer_first") == "worker_first"

        if digit == "1":
            if is_worker_first:
                # Worker accepted first -> now call customer!
                c.execute(
                    "UPDATE ai_calls SET worker_keypad='1', status='worker_accepted', updated_at=? WHERE id=?",
                    (now, call_id),
                )
                new_status = "worker_accepted"
            else:
                # Customer accepted first -> now worker accepted -> bridge call!
                c.execute(
                    """
                    UPDATE ai_calls
                    SET worker_keypad = '1',
                        status = 'connecting',
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (now, call_id),
                )
                new_status = "connecting"
        elif digit == "2":
            # Worker declined
            duration = int(now - call["created_at"])
            c.execute(
                """
                UPDATE ai_calls
                SET worker_keypad = '2',
                    status = 'worker_declined',
                    failure_reason = 'Worker indicated unavailable',
                    duration_seconds = ?,
                    completed_at = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (duration, now, now, call_id),
            )
            new_status = "worker_declined"
        else:
            return {
                "ok": False,
                "message": "Invalid input. Worker should press 1 to accept.",
                "status": call["status"],
            }

    firebase_sync.sync_ai_call(call_id)

    if new_status == "worker_accepted":
        return trigger_customer_call(call_id)
    elif new_status == "connecting":
        return connect_call_bridge(call_id)

    return {"ok": True, "call_id": call_id, "status": new_status, "worker_keypad": digit}


def connect_call_bridge(call_id: int) -> Dict[str, Any]:
    """Connects Homeowner and Worker together in a conference/bridge call.
    AI agent departs the conversation once connected."""
    now = time.time()
    with db() as c:
        c.execute(
            """
            UPDATE ai_calls
            SET status = 'connected',
                notes = 'Customer & Worker successfully bridged via AI Agent',
                updated_at = ?
            WHERE id = ?
            """,
            (now, call_id),
        )
    firebase_sync.sync_ai_call(call_id)
    logger.info("Call #%s bridged: Customer and Worker connected!", call_id)

    return {
        "ok": True,
        "call_id": call_id,
        "status": "connected",
        "message": "होमओनर और कारीगर की कॉल आपस में कनेक्ट हो गई है। AI एजेंट कॉल से हट चुका है।",
    }


def complete_call(call_id: int, status: str = "completed", reason: str = "") -> Dict[str, Any]:
    """Marks call as completed or failed with total duration."""
    now = time.time()
    with db() as c:
        call = c.execute("SELECT * FROM ai_calls WHERE id = ?", (call_id,)).fetchone()
        if not call:
            raise HTTPException(404, "Call not found")

        duration = int(now - call["created_at"])
        c.execute(
            """
            UPDATE ai_calls
            SET status = ?,
                duration_seconds = ?,
                failure_reason = ?,
                completed_at = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (status, duration, reason, now, now, call_id),
        )
    firebase_sync.sync_ai_call(call_id)
    return {"ok": True, "call_id": call_id, "status": status, "duration_seconds": duration}


def simulate_step(call_id: int, action: str) -> Dict[str, Any]:
    """Interactive simulator for testing the entire flow from Admin UI without telephony credits."""
    action = action.lower().strip()
    if action == "customer_answer":
        with db() as c:
            c.execute("UPDATE ai_calls SET status='customer_answered', updated_at=? WHERE id=?", (time.time(), call_id))
        firebase_sync.sync_ai_call(call_id)
        return {"ok": True, "call_id": call_id, "status": "customer_answered"}

    elif action in ("customer_press_1", "customer_accept"):
        return handle_customer_dtmf(call_id, "1")

    elif action in ("customer_press_2", "customer_decline"):
        return handle_customer_dtmf(call_id, "2")

    elif action == "customer_no_answer":
        return complete_call(call_id, status="no_answer", reason="Customer did not pick up phone")

    elif action == "worker_answer":
        with db() as c:
            c.execute("UPDATE ai_calls SET status='worker_ringing', updated_at=? WHERE id=?", (time.time(), call_id))
        firebase_sync.sync_ai_call(call_id)
        return {"ok": True, "call_id": call_id, "status": "worker_ringing"}

    elif action in ("worker_press_1", "worker_accept"):
        return handle_worker_dtmf(call_id, "1")

    elif action in ("worker_press_2", "worker_decline"):
        return handle_worker_dtmf(call_id, "2")

    elif action == "worker_no_answer":
        return complete_call(call_id, status="failed", reason="Worker did not answer")

    elif action == "complete":
        return complete_call(call_id, status="completed", reason="Normal hangup")

    else:
        raise HTTPException(400, f"Unknown simulation action '{action}'")


# ----------------- Sarvam AI Integration Helpers -----------------
def _call_sarvam_outbound(
    call_id: int, phone: str, prompt: str, leg: str = "customer", extra_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Triggers outbound phone call via Sarvam AI Voice Agent (apps.sarvam.ai / Samvaad platform)."""
    if not (config.SARVAM_API_KEY and config.SARVAM_ORG_ID and config.SARVAM_WORKSPACE_ID):
        logger.warning("Sarvam AI credentials (API key/org/workspace) not fully configured; falling back to simulator.")
        return {"provider": "simulator", "call_id": f"sim-sarvam-{leg}-{call_id}"}

    url = f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{config.SARVAM_ORG_ID}/workspaces/{config.SARVAM_WORKSPACE_ID}/outbounds"
    webhook_url = f"{config.BACKEND_BASE_URL}/api/webhooks/ai-calling/sarvam?call_id={call_id}&leg={leg}"

    raw_phone = str(phone).strip()
    digits = re.sub(r"[^\d]", "", raw_phone)
    formatted_phone = "+91" + digits[-10:] if len(digits) >= 10 else "+91" + digits

    app_config: Dict[str, Any] = {
        "app_id": config.SARVAM_APP_ID or "mistribhaiya-call-agent",
        "app_version": 1,
    }
    if config.SARVAM_CONNECTION_ID or config.SARVAM_AGENT_PHONE:
        conn: Dict[str, Any] = {}
        if config.SARVAM_CONNECTION_ID:
            conn["connection_id"] = config.SARVAM_CONNECTION_ID
        if config.SARVAM_AGENT_PHONE:
            conn["agent_phone_number"] = config.SARVAM_AGENT_PHONE
        app_config["connection_config"] = conn

    payload = {
        "app_config": app_config,
        "user_config": {
            "user_phone_number": formatted_phone,
        },
        "webhook_config": {
            "url": webhook_url,
        },
        "context": {
            "call_id": call_id,
            "leg": leg,
            "speech_prompt": prompt,
            **(extra_context or {}),
        },
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "X-API-Key": config.SARVAM_API_KEY,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        attempt_id = res.get("attempt_id") or res.get("id") or f"sarvam-{call_id}-{int(time.time())}"
        logger.info("Sarvam AI outbound call initiated: attempt_id=%s call_id=#%s leg=%s", attempt_id, call_id, leg)
        return {"provider": "sarvam", "call_id": attempt_id}


# ----------------- Vapi AI Integration Helpers -----------------
def _call_vapi_customer(call_id: int, phone: str, prompt: str, worker_name: str, skill_hi: str) -> Dict[str, Any]:
    url = "https://api.vapi.ai/call/phone"
    headers = {
        "Authorization": f"Bearer {config.VAPI_API_KEY}",
        "Content-Type": "application/json",
    }
    webhook_url = f"{config.BACKEND_BASE_URL}/api/webhooks/ai-calling/vapi?call_id={call_id}&leg=customer"

    payload: Dict[str, Any] = {
        "customer": {"number": "+91" + phone[-10:]},
    }
    if config.VAPI_PHONE_NUMBER_ID:
        payload["phoneNumberId"] = config.VAPI_PHONE_NUMBER_ID

    asst_id = config.VAPI_CUSTOMER_ASSISTANT_ID or config.VAPI_ASSISTANT_ID
    if asst_id:
        payload["assistantId"] = asst_id
        payload["assistantOverrides"] = {
            "firstMessage": prompt,
            "variableValues": {
                "worker_name": worker_name,
                "skill": skill_hi,
                "call_id": str(call_id),
            },
            "serverUrl": webhook_url,
        }
    else:
        payload["assistant"] = {
            "firstMessage": prompt,
            "model": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            f"Aap Mistri App ke AI agent hain. Hindi/Hinglish mein baat karein. "
                            f"Aap customer ko batate hain ki mistri {worker_name} ({skill_hi}) available hain. "
                            f"Agar customer 1 dabaye ya haan kahe toh unhein batayein ki mistri ko connect kar rahe hain. "
                            f"Agar 2 dabaye ya na kahe toh call samapt karein."
                        ),
                    }
                ],
            },
            "serverUrl": webhook_url,
        }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=12) as resp:
        res = json.loads(resp.read().decode())
        return {"provider": "vapi", "call_id": res.get("id", "")}


def _call_vapi_worker(call_id: int, phone: str, prompt: str, skill_hi: str) -> Dict[str, Any]:
    url = "https://api.vapi.ai/call/phone"
    headers = {
        "Authorization": f"Bearer {config.VAPI_API_KEY}",
        "Content-Type": "application/json",
    }
    webhook_url = f"{config.BACKEND_BASE_URL}/api/webhooks/ai-calling/vapi?call_id={call_id}&leg=worker"

    payload: Dict[str, Any] = {
        "customer": {"number": "+91" + phone[-10:]},
    }
    if config.VAPI_PHONE_NUMBER_ID:
        payload["phoneNumberId"] = config.VAPI_PHONE_NUMBER_ID

    asst_id = config.VAPI_WORKER_ASSISTANT_ID or config.VAPI_ASSISTANT_ID
    if asst_id:
        payload["assistantId"] = asst_id
        payload["assistantOverrides"] = {
            "firstMessage": prompt,
            "variableValues": {
                "skill": skill_hi,
                "call_id": str(call_id),
            },
            "serverUrl": webhook_url,
        }
    else:
        payload["assistant"] = {
            "firstMessage": prompt,
            "model": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            f"Aap Mistri App ke AI agent hain. Hindi mein baat karein. "
                            f"Aap worker se pooch rahe hain ki kya woh {skill_hi} ke kaam ke liye available hain. "
                            f"Haan ke liye 1 dabane ko kahein."
                        ),
                    }
                ],
            },
            "serverUrl": webhook_url,
        }
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=12) as resp:
        res = json.loads(resp.read().decode())
        return {"provider": "vapi", "call_id": res.get("id", "")}


# ----------------- Twilio Integration Helpers -----------------
def _call_twilio_customer(call_id: int, phone: str, prompt: str) -> Dict[str, Any]:
    import base64
    url = f"https://api.twilio.com/2010-04-01/Accounts/{config.TWILIO_ACCOUNT_SID}/Calls.json"
    twiml = (
        f"<Response>"
        f"<Gather numDigits='1' action='{config.BACKEND_BASE_URL}/api/webhooks/ai-calling/twilio?call_id={call_id}&amp;leg=customer' method='POST' timeout='8'>"
        f"<Say language='hi-IN'>{prompt}</Say>"
        f"</Gather>"
        f"<Say language='hi-IN'>Humein koi uttar nahi mila. Dhanyavaad.</Say>"
        f"</Response>"
    )
    data = urllib.parse.urlencode({
        "To": "+91" + phone[-10:],
        "From": config.TWILIO_FROM_NUMBER,
        "Twiml": twiml,
    }).encode()
    auth = base64.b64encode(f"{config.TWILIO_ACCOUNT_SID}:{config.TWILIO_AUTH_TOKEN}".encode()).decode()
    req = urllib.request.Request(url, data=data, headers={"Authorization": f"Basic {auth}"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        res = json.loads(resp.read().decode())
        return {"provider": "twilio", "call_id": res.get("sid", "")}


def _call_twilio_worker(call_id: int, phone: str, prompt: str) -> Dict[str, Any]:
    import base64
    url = f"https://api.twilio.com/2010-04-01/Accounts/{config.TWILIO_ACCOUNT_SID}/Calls.json"
    twiml = (
        f"<Response>"
        f"<Gather numDigits='1' action='{config.BACKEND_BASE_URL}/api/webhooks/ai-calling/twilio?call_id={call_id}&amp;leg=worker' method='POST' timeout='8'>"
        f"<Say language='hi-IN'>{prompt}</Say>"
        f"</Gather>"
        f"<Say language='hi-IN'>Dhanyavaad.</Say>"
        f"</Response>"
    )
    data = urllib.parse.urlencode({
        "To": "+91" + phone[-10:],
        "From": config.TWILIO_FROM_NUMBER,
        "Twiml": twiml,
    }).encode()
    auth = base64.b64encode(f"{config.TWILIO_ACCOUNT_SID}:{config.TWILIO_AUTH_TOKEN}".encode()).decode()
    req = urllib.request.Request(url, data=data, headers={"Authorization": f"Basic {auth}"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        res = json.loads(resp.read().decode())
        return {"provider": "twilio", "call_id": res.get("sid", "")}


# ----------------- Exotel Integration Helpers -----------------
def _call_exotel_customer(call_id: int, phone: str) -> Dict[str, Any]:
    import base64
    url = f"https://{config.EXOTEL_SUBDOMAIN}/v1/Accounts/{config.EXOTEL_SID}/Calls/connect.json"
    data = urllib.parse.urlencode({
        "From": "0" + phone[-10:],
        "CallerId": config.EXOTEL_EXOPHONE,
        "Url": f"{config.BACKEND_BASE_URL}/api/webhooks/ai-calling/exotel?call_id={call_id}&leg=customer",
    }).encode()
    auth = base64.b64encode(f"{config.EXOTEL_API_KEY}:{config.EXOTEL_API_TOKEN}".encode()).decode()
    req = urllib.request.Request(url, data=data, headers={"Authorization": f"Basic {auth}"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        res = json.loads(resp.read().decode())
        sid = (res.get("Call") or {}).get("Sid", "")
        return {"provider": "exotel", "call_id": sid}
