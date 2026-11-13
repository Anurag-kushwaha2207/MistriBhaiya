import asyncio, os, sys, tempfile
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if "DB_PATH" not in os.environ:
    os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t_nlp.db")
os.environ["DEV_MODE"] = "1"

import pytest
from datetime import date, timedelta
from app.db import init_db
init_db()
from app.assistant import (
    find_skills,
    detect_intent,
    extract_date,
    extract_days,
    extract_budget,
    geocode_city,
    classify_and_extract,
    handle,
    AssistantReq,
)
from app.common import today

# -------------------------------------------------------------------------
# 1. Colloquial synonyms & skill extraction (Hindi, Hinglish, Regional)
# -------------------------------------------------------------------------
SKILL_TEST_CASES = [
    ("ghar me colour wala chahiye", "painter"),
    ("diwal par putai karwani hai", "painter"),
    ("whitewash aur putty lagwana hai", "painter"),
    ("bijli wala bhejo jaldi", "electrician"),
    ("short circuit ho gaya wiring theek karo", "electrician"),
    ("light wala misteri chahiye", "electrician"),
    ("nal wala bulao pipe leak hai", "plumber"),
    ("pani wala tanki fitting", "plumber"),
    ("chunai aur plaster ka kaam hai", "rajmistri"),
    ("itai lagwane ke liye mistri chahiye", "rajmistri"),
    ("dhalai ke liye rajmistri bulao", "rajmistri"),
    ("sariya bandhne wala mistri chahiye", "bar_bender"),
    ("loha bandhne wala bar bender", "bar_bender"),
    ("lakdi ka darwaza banwana hai badhai chahiye", "carpenter"),
    ("furniture repairing carpenter", "carpenter"),
    ("bathroom me tiles lagwani hai", "tiles"),
    ("marbal aur pathar lagane wala", "tiles"),
    ("lohe ka gate welding karwana hai", "welder"),
    ("ceiling me pop lagwana hai", "pop"),
    ("beldar aur kuli chahiye mazdoor", "labour"),
    ("helper mazdoor chahiye eent uthane ke liye", "labour"),
]

@pytest.mark.parametrize("utterance,expected_skill", SKILL_TEST_CASES)
def test_skill_extraction(utterance, expected_skill):
    skills = find_skills(utterance)
    assert expected_skill in skills, f"Failed for '{utterance}', got {skills}"


# -------------------------------------------------------------------------
# 2. Intent classification (English, Hindi, Hinglish)
# -------------------------------------------------------------------------
INTENT_TEST_CASES = [
    # instant_request
    ("turant mistri bhejo", "instant_request"),
    ("urgent plumber chahiye abhi", "instant_request"),
    ("jaldi electrician bulao emergency hai", "instant_request"),
    ("need instant mason right now", "instant_request"),
    ("tatkal mistri chahiye", "instant_request"),

    # post_job
    ("kam post karna hai", "post_job"),
    ("naya job post karo", "post_job"),
    ("kal ke liye ek mistri chahiye 2 din", "post_job"),
    ("plaster karwana hai theka dena hai", "post_job"),
    ("putai karwani hai 3 din ke liye", "post_job"),
    ("chunai karwani hai budget 2000", "post_job"),

    # set_free
    ("mai free hu", "free"),
    ("aaj mai khali hu", "free"),
    ("free ho gaya hu kaam do", "free"),
    ("i am free today", "free"),

    # set_busy
    ("mai busy hu abhi", "busy"),
    ("abhi dusra kaam kar raha hu busy", "busy"),
    ("i am busy", "busy"),

    # set_offline
    ("aaj chhutti hai kaam band", "offline"),
    ("aaj offline hu", "offline"),
    ("aaj nahi aaunga off", "offline"),
    ("off today", "offline"),

    # earnings
    ("meri kamai kitni hui", "earnings"),
    ("total earning dikhao", "earnings"),
    ("is mahine ke kitne paise bane", "earnings"),

    # show_jobs
    ("paas ke kaam dikhao", "jobs"),
    ("nearby jobs", "jobs"),
    ("mere area me koi kaam hai kya", "jobs"),

    # bookings
    ("meri booking status kya hai", "bookings"),
    ("show my bookings", "bookings"),

    # find_workers
    ("mistri dhundo", "find_workers"),
    ("search painter near me", "find_workers"),
]

@pytest.mark.parametrize("utterance,expected_intent", INTENT_TEST_CASES)
def test_intent_detection(utterance, expected_intent):
    intent = detect_intent(utterance)
    assert intent == expected_intent, f"Failed for '{utterance}', got {intent}"


# -------------------------------------------------------------------------
# 3. Entity Extraction: Date, Days, Budget, City
# -------------------------------------------------------------------------
def test_date_extraction():
    ref = date(2026, 11, 7) # Saturday
    assert extract_date("aaj kaam shuru karna hai", ref) == "2026-11-07"
    assert extract_date("today urgent", ref) == "2026-11-07"
    assert extract_date("kal subah aana", ref) == "2026-11-08"
    assert extract_date("tomorrow morning", ref) == "2026-11-08"
    assert extract_date("parson kaam karenge", ref) == "2026-11-09"
    assert extract_date("day after tomorrow", ref) == "2026-11-09"
    assert extract_date("narson aana", ref) == "2026-11-10"
    assert extract_date("somwar ko aana", ref) == "2026-11-09"
    assert extract_date("2026-11-15 ko kaam hai", ref) == "2026-11-15"
    assert extract_date("15 tarikh ko chahiye", ref) == "2026-11-15"


def test_days_extraction():
    assert extract_days("2 din ka kaam hai") == 2
    assert extract_days("do din lagenge") == 2
    assert extract_days("3 days job") == 3
    assert extract_days("teen din") == 3
    assert extract_days("ek hafta lagega") == 7
    assert extract_days("1 week duration") == 7
    assert extract_days("do hafte ka theka") == 14
    assert extract_days("2 weeks") == 14
    assert extract_days("1 month project") == 30


def test_budget_extraction():
    assert extract_budget("budget 1500 rs") == 1500
    assert extract_budget("1500 rupaye dunga") == 1500
    assert extract_budget("₹2000 per day") == 2000
    assert extract_budget("rate 800/din") == 800
    assert extract_budget("2 hazar rupaye") == 2000
    assert extract_budget("5 hazar total") == 5000


def test_geocoding_city():
    res = geocode_city("mujhe kanpur me painter chahiye")
    assert res is not None and res["city"] == "Kanpur"
    assert abs(res["lat"] - 26.4499) < 0.01

    res_lko = geocode_city("lucknow me kaam hai")
    assert res_lko is not None and res_lko["city"] == "Lucknow"

    res_del = geocode_city("delhi ncr ke liye mistri")
    assert res_del is not None and res_del["city"] == "Delhi"

    res_agra = geocode_city("agra me chunai")
    assert res_agra is not None and res_agra["city"] == "Agra"


def test_classify_and_extract_combined():
    text = "mujhe kal ke liye kanpur me 2 din ka painter chahiye budget 1500"
    res = classify_and_extract(text, role="customer")
    assert res["intent"] == "post_job"
    assert res["skill"] == "painter"
    assert res["days"] == 2
    assert res["budget"] == 1500
    assert res["city"] == "Kanpur"
    assert res["lat"] is not None


# -------------------------------------------------------------------------
# 4. Confirmation Flow State Machine Transitions
# -------------------------------------------------------------------------
def test_customer_post_job_confirmation_flow():
    from app.db import db
    import time
    with db() as c:
        row = c.execute("SELECT id FROM users WHERE phone='9837101839'").fetchone()
        if row:
            cid = row["id"]
        else:
            cur = c.execute("INSERT INTO users(phone, role, name, created_at) VALUES('9837101839', 'customer', 'Amit Kumar', ?)", (time.time(),))
            cid = cur.lastrowid

    async def _run():
        customer_user = {
            "id": cid,
            "role": "customer",
            "name": "Amit Kumar",
            "phone": "9837101839",
            "lang": "hi",
        }
        state = {}
        req = AssistantReq(text="mujhe kal ke liye painter chahiye 2 din budget 1200 kanpur")
        reply, chips, actions = await handle(customer_user, "customer", "hi", state, req, False)

        # State must now hold pending_confirmation for post_job
        assert "pending_confirmation" in state
        assert state["pending_confirmation"]["action"] == "post_job"
        assert state["pending_confirmation"]["data"]["skill"] == "painter"
        assert state["pending_confirmation"]["data"]["days"] == 2
        assert state["pending_confirmation"]["data"]["budget"] == 1200
        assert "हाँ" in reply or "Yes" in reply or "पुष्टि" in reply

        # Scenario A: User confirms with 'haan'
        req_yes = AssistantReq(text="haan confirm karo")
        reply_yes, chips_yes, actions_yes = await handle(customer_user, "customer", "hi", state, req_yes, False)
        assert "pending_confirmation" not in state
        assert "पोस्ट हो गया" in reply_yes or "posted" in reply_yes.lower()

        # Scenario B: User cancels with 'nahi'
        state_b = {
            "pending_confirmation": {
                "action": "post_job",
                "data": {"skill": "plumber", "days": 1, "budget": 500}
            }
        }
        req_no = AssistantReq(text="nahi cancel karo")
        reply_no, _, _ = await handle(customer_user, "customer", "hi", state_b, req_no, False)
        assert "pending_confirmation" not in state_b
        assert "रद्द" in reply_no or "cancelled" in reply_no.lower()

    asyncio.run(_run())


# -------------------------------------------------------------------------
# 5. Role Boundary & Security Checks
# -------------------------------------------------------------------------
def test_role_boundaries_security():
    async def _run():
        worker_user = {
            "id": 9992,
            "role": "worker",
            "name": "Ramesh Worker",
            "phone": "9837101838",
            "lang": "hi",
        }
        customer_user = {
            "id": 9993,
            "role": "customer",
            "name": "Suresh Customer",
            "phone": "9837101839",
            "lang": "hi",
        }

        # Worker trying to post a job must be politely rejected with explanation
        req_worker_post = AssistantReq(text="naya kaam post karo painter chahiye")
        reply_w, _, _ = await handle(worker_user, "worker", "hi", {}, req_worker_post, False)
        assert "ग्राहक" in reply_w or "Customer" in reply_w or "काम" in reply_w

        # Customer trying to set availability status must be politely rejected
        req_cust_free = AssistantReq(text="mai free hu aaj")
        reply_c, _, _ = await handle(customer_user, "customer", "hi", {}, req_cust_free, False)
        assert "मिस्त्री" in reply_c or "worker" in reply_c.lower()

    asyncio.run(_run())
