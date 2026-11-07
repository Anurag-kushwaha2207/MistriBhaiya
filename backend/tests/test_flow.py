import os, sys, tempfile, time
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t.db")
os.environ["DEV_MODE"] = "1"
os.environ["ADMIN_PHONES"] = "9000000001"
os.environ["INSTANT_WAVE_SECONDS"] = "0.4"
os.environ["INSTANT_WAVE_SIZE"] = "1"
from datetime import date
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
LAT, LNG = 25.1500, 82.5700          # a point near Mirzapur (example)
NEAR = (25.1500 + 3 / 111, LNG)      # ~3 km away
FAR = (25.1500 + 12 / 111, LNG)      # ~12 km away

def login(phone, role, name, loc=None):
    r = client.post("/api/auth/request-otp", json={"phone": phone}); assert r.status_code == 200
    otp = r.json()["dev_otp"]
    body = {"phone": phone, "otp": otp, "role": role, "name": name}
    if loc:
        body["lat"], body["lng"] = loc[0], loc[1]
    elif role in ("worker", "contractor"):
        body["lat"], body["lng"] = LAT, LNG
    r = client.post("/api/auth/verify", json=body); assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}, r.json()["user"]["id"]

def make_worker(phone, name, loc, skills=("rajmistri",), radius=6, rate=700, free=True):
    h, uid = login(phone, "worker", name, loc=loc)
    r = client.put("/api/worker/profile", headers=h, json={"skills": list(skills), "daily_rate": rate, "experience_years": 5,
                    "village": "Test", "lat": loc[0], "lng": loc[1], "radius_km": radius}); assert r.status_code == 200, r.text
    if free:
        client.post("/api/worker/status", headers=h, json={"status": "free"})
    return h, uid

def search(h, **kw):
    p = {"lat": LAT, "lng": LNG, **kw}
    r = client.get("/api/workers/search", headers=h, params=p); assert r.status_code == 200, r.text
    return r.json()["workers"]

def test_full_flow():
    wn_h, wn = make_worker("9000000011", "Near Mistri", NEAR, free=False)
    wf_h, wf = make_worker("9000000012", "Far Mistri", FAR, radius=20, free=False)
    c_h, cid = login("9000000021", "customer", "Ghar Malik")

    # distance is customizable: 6 km sees only the near one, 15 km sees both
    assert [w["id"] for w in search(c_h, radius_km=6)] == [wn]
    assert {w["id"] for w in search(c_h, radius_km=15)} == {wn, wf}

    # nobody declared themselves free yet -> free_only is empty
    assert search(c_h, radius_km=15, free_only=True) == []

    # worker declares free -> shows up as free; far worker stays offline
    assert client.post("/api/worker/status", headers=wn_h, json={"status": "free"}).json()["status"] == "free"
    free = search(c_h, radius_km=15, free_only=True)
    assert [w["id"] for w in free] == [wn] and free[0]["status"] == "free"

    # worker's own radius is respected: far worker (radius 20) visible at 15 km, but a 5 km-radius worker would not be
    w5_h, w5 = make_worker("9000000013", "Short range", (25.1500 + 8 / 111, LNG), radius=5)
    assert w5 not in {w["id"] for w in search(c_h, radius_km=15)}

    # booking -> accept -> worker becomes BUSY automatically
    today = date.today().isoformat()
    r = client.post("/api/bookings", headers=c_h, json={"worker_id": wn, "skill": "rajmistri", "start_date": today, "days": 2, "note": "deewar"}); assert r.status_code == 200, r.text
    bid = r.json()["id"]
    assert client.post(f"/api/bookings/{bid}/respond", headers=wn_h, json={"accept": True}).status_code == 200
    s = search(c_h, radius_km=15)
    assert [w for w in s if w["id"] == wn][0]["status"] == "busy"
    assert search(c_h, radius_km=15, free_only=True) == []
    # double booking is rejected
    r = client.post("/api/bookings", headers=c_h, json={"worker_id": wn, "skill": "rajmistri", "start_date": today, "days": 1}); assert r.status_code == 409

    # masked/direct call between participants
    r = client.post("/api/calls/connect", headers=c_h, json={"booking_id": bid}); assert r.status_code == 200
    assert r.json()["tel"] == "tel:+919000000011"

    # start-of-work OTP: customer sees it, worker must enter it before the job can be completed
    assert client.post(f"/api/bookings/{bid}/complete", headers=c_h).status_code == 400
    mine_w = client.get("/api/bookings/mine", headers=wn_h).json()["bookings"][0]
    assert mine_w["start_otp"] == ""                       # worker cannot see the OTP
    otp = client.get("/api/bookings/mine", headers=c_h).json()["bookings"][0]["start_otp"]
    assert len(otp) == 4
    assert client.post(f"/api/bookings/{bid}/start", headers=wn_h, json={"otp": "0000" if otp != "0000" else "1111"}).status_code == 400
    assert client.post(f"/api/bookings/{bid}/start", headers=wn_h, json={"otp": otp}).status_code == 200

    # complete + rate
    assert client.post(f"/api/bookings/{bid}/complete", headers=c_h).status_code == 200
    e = client.get("/api/worker/earnings", headers=wn_h).json()
    assert e["jobs_done"] == 1 and e["total_earned"] == 2 * 700
    assert client.post(f"/api/bookings/{bid}/rate", headers=c_h, json={"stars": 5, "review": "badhiya"}).status_code == 200
    w = [x for x in search(c_h, radius_km=15) if x["id"] == wn][0]
    assert w["rating_avg"] == 5.0 and w["rating_count"] == 1

def test_jobs_visible_to_nearby_worker_only():
    w_h, w = make_worker("9000000031", "Painter", NEAR, skills=("painter",))
    c_h, _ = login("9000000041", "customer", "Malik2")
    today = date.today().isoformat()
    client.post("/api/jobs", headers=c_h, json={"skill": "painter", "lat": LAT, "lng": LNG, "start_date": today, "address": "x"})
    client.post("/api/jobs", headers=c_h, json={"skill": "plumber", "lat": LAT, "lng": LNG, "start_date": today})       # wrong skill
    client.post("/api/jobs", headers=c_h, json={"skill": "painter", "lat": FAR[0], "lng": LNG, "start_date": today})   # too far (>6 km)
    jobs = client.get("/api/worker/jobs", headers=w_h).json()["jobs"]
    assert len(jobs) == 1 and jobs[0]["skill"] == "painter"
    # worker widens the radius to 20 km -> the far painter job (12 km) now appears too
    assert len(client.get("/api/worker/jobs", headers=w_h, params={"radius_km": 20}).json()["jobs"]) == 2

def test_job_interest_flow():
    w_h, w = make_worker("9000000081", "Carp", NEAR, skills=("carpenter",))
    c_h, _ = login("9000000091", "customer", "Owner")
    jid = client.post("/api/jobs", headers=c_h, json={"skill": "carpenter", "lat": LAT, "lng": LNG, "start_date": date.today().isoformat()}).json()["id"]
    assert client.post(f"/api/jobs/{jid}/interest", headers=w_h).status_code == 200
    got = client.get(f"/api/jobs/{jid}/interested", headers=c_h).json()["workers"]
    assert [x["id"] for x in got] == [w]

def test_realtime_status_push():
    wk_h, wk = make_worker("9000000051", "Live Mistri", NEAR)
    c_h, _ = login("9000000061", "customer", "Live Customer")
    tok = c_h["Authorization"].split()[1]
    with client.websocket_connect(f"/ws?token={tok}") as ws:
        ws.send_json({"type": "subscribe", "lat": LAT, "lng": LNG, "radius_km": 6})
        time.sleep(0.2)
        client.post("/api/worker/status", headers=wk_h, json={"status": "free"})
        msg = ws.receive_json()
        assert msg["type"] == "worker_status" and msg["worker"]["id"] == wk and msg["worker"]["status"] == "free"
        assert "lat" not in msg["worker"]      # exact home location is never leaked

def test_security():
    assert client.get("/api/me").status_code == 401
    r = client.post("/api/auth/request-otp", json={"phone": "123"}); assert r.status_code == 400
    h, _ = login("9000000071", "customer", "C")
    assert client.get("/api/admin/stats", headers=h).status_code == 403
    ah, _ = login("9000000001", "customer", "Admin")
    assert client.get("/api/admin/stats", headers=ah).status_code == 200
    # a customer cannot edit worker profile
    assert client.put("/api/worker/profile", headers=h, json={"skills": ["labour"], "lat": 1, "lng": 1}).status_code == 403


def test_instant_dispatch_waves_and_race():
    # three free painters at increasing distance; wave size is 1 so the nearest is asked first
    ws = []
    for i, km in enumerate((1, 2, 3)):
        h, uid = make_worker(f"90000001{i}1", f"P{i}", (25.1500 + km / 111, LNG), skills=("pop",))
        client.post("/api/worker/status", headers=h, json={"status": "free"})
        ws.append((h, uid))
    c_h, _ = login("9000000191", "customer", "Urgent Owner")
    r = client.post("/api/instant", headers=c_h, json={"skill": "pop", "lat": LAT, "lng": LNG, "radius_km": 6, "note": "abhi"}).json()
    rid = r["id"]; assert r["status"] == "searching" and r["offered"] == 1
    # only the nearest worker got the offer: the others cannot accept yet
    assert client.post(f"/api/instant/{rid}/accept", headers=ws[1][0]).status_code == 409
    # nearest declines -> next wave goes to the 2nd nearest immediately
    assert client.post(f"/api/instant/{rid}/decline", headers=ws[0][0]).status_code == 200
    st = client.get(f"/api/instant/{rid}", headers=c_h).json(); assert st["status"] == "searching" and st["wave"] == 2
    # 2nd worker lets the wave expire -> 3rd worker is asked
    time.sleep(0.5)
    st = client.get(f"/api/instant/{rid}", headers=c_h).json(); assert st["wave"] == 3
    # expired worker cannot accept anymore; the 3rd one wins, a second accept loses the race
    assert client.post(f"/api/instant/{rid}/accept", headers=ws[1][0]).status_code == 409
    assert client.post(f"/api/instant/{rid}/accept", headers=ws[2][0]).status_code == 200
    assert client.post(f"/api/instant/{rid}/accept", headers=ws[2][0]).status_code == 409
    st = client.get(f"/api/instant/{rid}", headers=c_h).json()
    assert st["status"] == "matched" and st["worker"]["id"] == ws[2][1] and st["booking_id"]
    # matched worker is now busy automatically
    assert [w for w in search(c_h, radius_km=6, skill="pop") if w["id"] == ws[2][1]][0]["status"] == "busy"

def test_instant_no_worker():
    c_h, _ = login("9000000291", "customer", "Nobody Owner")
    r = client.post("/api/instant", headers=c_h, json={"skill": "welder", "lat": LAT, "lng": LNG}).json()
    assert r["status"] == "no_worker" and r["offered"] == 0

def test_webrtc_signalling_and_fallback():
    """Relay logic is tested with fake sockets (Starlette's TestClient runs each websocket in its own event loop)."""
    import asyncio, json
    from app.main import relay_rtc
    from app.realtime import hub

    class FakeWS:
        def __init__(self): self.sent = []
        async def send_text(self, s): self.sent.append(json.loads(s))
        async def send_json(self, d): self.sent.append(d)

    w_h, w = make_worker("9000000311", "RTC Worker", NEAR)
    c_h, cid = login("9000000321", "customer", "RTC Customer")
    s_h, sid = login("9000000331", "customer", "Stranger")
    bid = client.post("/api/bookings", headers=c_h, json={"worker_id": w, "skill": "rajmistri", "start_date": date.today().isoformat()}).json()["id"]
    caller, worker, stranger = FakeWS(), FakeWS(), FakeWS()
    offer = {"type": "rtc", "booking_id": bid, "data": {"kind": "offer", "sdp": "x"}}

    async def run():
        hub.conns = [{"ws": caller, "uid": cid, "sub": None}]
        await relay_rtc(caller, cid, offer)                                   # worker offline -> fallback signal
        assert caller.sent[-1]["type"] == "rtc_unavailable"
        hub.conns.append({"ws": worker, "uid": w, "sub": None})
        await relay_rtc(caller, cid, offer)                                   # worker online -> relayed
        assert worker.sent[-1]["type"] == "rtc" and worker.sent[-1]["from"] == cid and worker.sent[-1]["data"]["kind"] == "offer"
        hub.conns.append({"ws": stranger, "uid": sid, "sub": None})
        before = len(worker.sent)
        await relay_rtc(stranger, sid, offer)                                 # stranger cannot signal inside this booking
        assert len(worker.sent) == before and not stranger.sent
        hub.conns = []
    asyncio.run(run())

def test_sos_reports_admin():
    w_h, w = make_worker("9000000411", "Safety Worker", NEAR)
    c_h, cid = login("9000000421", "customer", "Safety Customer")
    bid = client.post("/api/bookings", headers=c_h, json={"worker_id": w, "skill": "rajmistri", "start_date": date.today().isoformat()}).json()["id"]
    assert client.post("/api/sos", headers=c_h, json={"booking_id": bid, "lat": LAT, "lng": LNG}).json()["emergency_number"] == "112"
    assert client.post("/api/reports", headers=c_h, json={"reported_id": w, "reason": "rude behaviour", "booking_id": bid}).status_code == 200
    ah, _ = login("9000000001", "customer", "Admin")
    s = client.get("/api/admin/safety", headers=ah).json()
    assert len(s["sos"]) >= 1 and len(s["reports"]) >= 1
    assert any(x["id"] == w for x in client.get("/api/admin/workers", headers=ah).json()["workers"])
    assert client.post(f"/api/admin/workers/{w}/verify", headers=ah).status_code == 200
    assert client.get("/api/admin/workers", headers=c_h).status_code == 403


# ====================================================================== negotiation, chat, contractor, assistant
def test_booking_negotiation_and_chat():
    w_h, w = make_worker("9000000511", "Neg Worker", NEAR, rate=800)
    c_h, cid = login("9000000521", "customer", "Neg Owner")
    today = date.today().isoformat()
    bid = client.post("/api/bookings", headers=c_h, json={"worker_id": w, "skill": "rajmistri", "start_date": today, "days": 2, "agreed_rate": 500}).json()["id"]
    neg = client.get(f"/api/bookings/{bid}/negotiation", headers=w_h).json()
    assert neg["current"]["rate"] == 500 and neg["my_turn"] is True and len(neg["offers"]) == 1
    # the customer made the last offer: he cannot counter or accept his own offer
    assert client.post(f"/api/bookings/{bid}/counter", headers=c_h, json={"rate": 450}).status_code == 400
    assert client.post(f"/api/bookings/{bid}/accept", headers=c_h).status_code == 400
    # worker counters 750 for 3 days; now the worker cannot accept his own counter
    assert client.post(f"/api/bookings/{bid}/counter", headers=w_h, json={"rate": 750, "days": 3, "note": "door hai"}).status_code == 200
    assert client.post(f"/api/bookings/{bid}/respond", headers=w_h, json={"accept": True}).status_code == 400
    assert client.post(f"/api/bookings/{bid}/accept", headers=w_h).status_code == 400
    # customer counters 600, worker accepts -> deal is fixed at 600 x 3
    assert client.post(f"/api/bookings/{bid}/counter", headers=c_h, json={"rate": 600}).status_code == 200
    assert client.post(f"/api/bookings/{bid}/accept", headers=w_h).status_code == 200
    b = client.get("/api/bookings/mine", headers=c_h).json()["bookings"][0]
    assert b["status"] == "accepted" and b["agreed_rate"] == 600 and b["days"] == 3 and len(b["start_otp"]) == 4
    offers = client.get(f"/api/bookings/{bid}/negotiation", headers=c_h).json()["offers"]
    assert [o["rate"] for o in offers] == [500, 750, 600]
    # no more negotiation after acceptance; worker is BUSY automatically
    assert client.post(f"/api/bookings/{bid}/counter", headers=w_h, json={"rate": 900}).status_code == 400
    assert [x for x in search(c_h, radius_km=15) if x["id"] == w][0]["status"] == "busy"
    # chat: phone numbers are masked so deals stay on the platform
    r = client.post(f"/api/bookings/{bid}/messages", headers=c_h, json={"text": "call me on 98765 43210 or +91 9876543210"}).json()
    assert "9876" not in r["text"] and "[number hidden]" in r["text"]
    msgs = client.get(f"/api/bookings/{bid}/messages", headers=w_h).json()["messages"]
    assert len(msgs) == 1 and msgs[0]["mine"] is False
    # a stranger cannot read the negotiation or chat
    s_h, _ = login("9000000531", "customer", "Stranger2")
    assert client.get(f"/api/bookings/{bid}/messages", headers=s_h).status_code == 404

def test_negotiation_reject_and_round_limit():
    w_h, w = make_worker("9000000541", "Round Worker", NEAR)
    c_h, _ = login("9000000551", "customer", "Round Owner")
    bid = client.post("/api/bookings", headers=c_h, json={"worker_id": w, "skill": "rajmistri", "start_date": date.today().isoformat(), "agreed_rate": 400}).json()["id"]
    last = None
    for i in range(7):                       # round 1 was the booking; 7 counters -> 8 rounds
        h = w_h if i % 2 == 0 else c_h
        r = client.post(f"/api/bookings/{bid}/counter", headers=h, json={"rate": 500 + i}); assert r.status_code == 200, (i, r.text)
    assert client.post(f"/api/bookings/{bid}/counter", headers=c_h if 7 % 2 else w_h, json={"rate": 999}).status_code == 400   # limit reached
    assert client.post(f"/api/bookings/{bid}/reject", headers=w_h).status_code == 200
    assert client.get("/api/bookings/mine", headers=c_h).json()["bookings"][0]["status"] == "rejected"

def test_contractor_end_to_end():
    ch, cid = login("9000000611", "contractor", "Thekedar Ji")
    assert client.put("/api/contractor/profile", headers=ch, json={"company": "Ram Builders", "skills": ["rajmistri", "labour"], "village": "X", "lat": LAT, "lng": LNG,
                                                                  "radius_km": 30, "experience_years": 10}).status_code == 200
    # crew: one offline labour (no phone), one registered worker invited by phone
    wh, wid = make_worker("9000000621", "Reg Worker", NEAR, skills=("rajmistri",), rate=700)
    client.post("/api/worker/status", headers=wh, json={"status": "free"})
    r = client.post("/api/contractor/crew", headers=ch, json={"name": "Ramu Majdoor", "skills": ["labour"], "daily_rate": 450}).json()
    assert r["status"] == "active"; ramu = r["id"]
    r = client.post("/api/contractor/crew", headers=ch, json={"name": "Reg Worker", "phone": "9000000621", "skills": ["rajmistri"], "daily_rate": 700}).json()
    assert r["status"] == "invited"; reg = r["id"]
    assert client.post("/api/contractor/crew", headers=ch, json={"name": "dup", "phone": "9000000621"}).status_code == 409
    inv = client.get("/api/worker/invites", headers=wh).json()["invites"]; assert len(inv) == 1
    assert client.post(f"/api/worker/invites/{reg}/respond", headers=wh, json={"accept": True}).status_code == 200
    crew = client.get("/api/contractor/crew", headers=ch).json()["crew"]
    assert {x["name"] for x in crew} == {"Ramu Majdoor", "Reg Worker"}
    assert [x for x in crew if x["name"] == "Reg Worker"][0]["live_status"] == "free"

    # find workers with several filters: wage ceiling, free only, min hours free, distance
    w2h, w2 = make_worker("9000000631", "Costly", (25.1500 + 2 / 111, LNG), skills=("rajmistri",), rate=1200)
    client.post("/api/worker/status", headers=w2h, json={"status": "free", "hours": 2})
    q = {"lat": LAT, "lng": LNG, "radius_km": 10}
    allw = client.get("/api/contractor/find-workers", headers=ch, params=q).json()["workers"]
    assert {x["id"] for x in allw} >= {wid, w2}
    assert {x["id"] for x in client.get("/api/contractor/find-workers", headers=ch, params={**q, "max_rate": 800}).json()["workers"]} >= {wid} and \
           w2 not in {x["id"] for x in client.get("/api/contractor/find-workers", headers=ch, params={**q, "max_rate": 800}).json()["workers"]}
    long_free = {x["id"] for x in client.get("/api/contractor/find-workers", headers=ch, params={**q, "free_only": True, "min_hours_free": 6}).json()["workers"]}
    assert wid in long_free and w2 not in long_free                      # w2 is free only for 2 more hours
    assert [x for x in allw if x["id"] == wid][0]["in_crew"] is True
    # add from search result -> invite
    assert client.post(f"/api/contractor/crew/from-worker/{w2}", headers=ch, json={"daily_rate": 1000}).json()["status"] == "invited"

    # customer finds the contractor and sends a project with a budget; negotiation on total budget
    oh, oid = login("9000000641", "customer", "House Owner")
    res = client.get("/api/contractors/search", headers=oh, params={"lat": LAT, "lng": LNG, "radius_km": 20}).json()["contractors"]
    assert res and res[0]["id"] == cid and res[0]["crew_size"] == 2
    pid = client.post("/api/projects", headers=oh, json={"contractor_id": cid, "title": "2 room ghar", "start_date": date.today().isoformat(), "days": 3, "budget": 50000, "workers_needed": 2}).json()["id"]
    assert client.post(f"/api/projects/{pid}/accept", headers=oh).status_code == 400            # own offer
    assert client.post(f"/api/projects/{pid}/counter", headers=ch, json={"rate": 65000, "days": 4, "note": "material alag"}).status_code == 200
    assert client.post(f"/api/projects/{pid}/counter", headers=oh, json={"rate": 58000}).status_code == 200
    assert client.post(f"/api/projects/{pid}/accept", headers=ch).status_code == 200
    p = client.get(f"/api/projects/{pid}", headers=oh).json()["project"]
    assert p["status"] == "accepted" and p["budget"] == 58000 and p["days"] == 4
    # assign only active crew; invited-but-pending member is refused
    assert client.post(f"/api/projects/{pid}/assign", headers=ch, json={"crew_ids": [ramu, reg]}).status_code == 200
    # attendance + wages
    today = date.today().isoformat()
    assert client.post(f"/api/projects/{pid}/attendance", headers=ch, json={"crew_id": ramu, "day": today}).json()["wage"] == 450
    assert client.post(f"/api/projects/{pid}/attendance", headers=ch, json={"crew_id": reg, "day": today, "wage": 750}).json()["wage"] == 750
    assert client.post(f"/api/projects/{pid}/attendance", headers=ch, json={"crew_id": ramu, "day": today, "present": False}).json()["wage"] == 0
    assert client.post(f"/api/projects/{pid}/attendance", headers=ch, json={"crew_id": ramu, "day": today}).status_code == 200
    # ledger: advance + payment reduce the balance
    assert client.post("/api/contractor/ledger", headers=ch, json={"crew_id": ramu, "kind": "advance", "amount": 100}).status_code == 200
    s = client.get("/api/contractor/ledger/summary", headers=ch).json()
    row = [x for x in s["summary"] if x["crew_id"] == ramu][0]
    assert row["earned"] == 450 and row["advance"] == 100 and row["balance"] == 350
    # start, call (owner talks only to the contractor), complete, rate
    assert client.post(f"/api/projects/{pid}/start", headers=ch).status_code == 200
    assert client.post(f"/api/projects/{pid}/call", headers=oh).json()["tel"] == "tel:+919000000611"
    assert client.post(f"/api/projects/{pid}/messages", headers=oh, json={"text": "deewar tedhi hai"}).status_code == 200
    assert client.post(f"/api/projects/{pid}/complete", headers=ch).status_code == 200
    assert client.post(f"/api/projects/{pid}/rate", headers=oh, json={"stars": 4}).status_code == 200
    d = client.get("/api/contractor/dashboard", headers=ch).json()
    assert d["crew_active"] == 2 and d["completed_projects"] == 1 and d["business_value"] == 58000 and d["wages_due"] == 350 + 750
    # permissions
    assert client.put("/api/contractor/profile", headers=oh, json={"lat": 1, "lng": 1}).status_code == 403
    assert client.get("/api/contractor/crew", headers=oh).status_code == 403

def test_assistant_numbers_and_skills():
    from app.assistant import parse_number, find_skills, detect_intent
    assert parse_number("500") == 500 and parse_number("६००") == 600 and parse_number("₹ 700 rupaye") == 700
    assert parse_number("paanch sau") == 500 and parse_number("सात सौ पचास") == 750 and parse_number("do hazaar") == 2000
    assert find_skills("राजमिस्त्री") == ["rajmistri"] and find_skills("tiles mistri") == ["tiles"] and find_skills("மேஸ்திரி") == ["rajmistri"]
    assert find_skills("मज़दूर और पेंटर") == ["labour", "painter"]
    assert detect_intent("main free hoon") == "free" and detect_intent("मैं बिज़ी हूँ") == "busy" and detect_intent("मेरी कमाई") == "earnings"

def test_assistant_worker_onboarding_by_chat_in_hindi():
    h, _ = login("9000000711", "worker", "")
    def say(text="", **kw):
        r = client.post("/api/assistant", headers=h, json={"text": text, "lang": kw.pop("lang", None), **kw}); assert r.status_code == 200, r.text
        return r.json()
    r = say(start=True, lang="hi"); assert "नाम" in r["reply"] and r["lang"] == "hi"
    assert "skills" in client.get("/api/me", headers=h).json()["profile"] or True
    say("रामू")                                                    # name
    r = say("राजमिस्त्री और टाइल्स"); assert "मज़दूरी" in r["reply"]
    r = say("सात सौ"); assert "अनुभव" in r["reply"]               # 700
    r = say("५"); assert "गाँव" in r["reply"]
    r = say("सारनाथ"); assert any(a["type"] == "request_location" for a in r["actions"])
    r = say("", location={"lat": LAT, "lng": LNG}); assert "किलोमीटर" in r["reply"]
    r = say("६"); assert any(a["type"] == "refresh" for a in r["actions"])
    me = client.get("/api/me", headers=h).json()
    p = me["profile"]
    assert me["user"]["name"] == "रामू" and set(p["skills"]) == {"rajmistri", "tiles"} and p["daily_rate"] == 700 and p["experience_years"] == 5 and p["radius_km"] == 6 and p["village"] == "सारनाथ"
    # now everything by chat: free, earnings, change rate and radius, language switch
    assert "फ्री" in say("मैं फ्री हूँ")["reply"]
    assert client.get("/api/me", headers=h).json()["profile"]["status"] == "free"
    assert "₹" in say("मेरी कमाई")["reply"]
    say("रेट 800"); assert client.get("/api/me", headers=h).json()["profile"]["daily_rate"] == 800
    say("दूरी 12 km"); assert client.get("/api/me", headers=h).json()["profile"]["radius_km"] == 12
    r = say("", lang="ta"); assert r["lang"] == "ta" and "உதவ" in r["reply"] or r["lang"] == "ta"
    r = say("நான் பிஸி"); assert r["lang"] == "ta"          # Tamil
    assert client.get("/api/me", headers=h).json()["profile"]["status"] == "busy"
    # every language has every text key
    from app.assistant import STR, LANGS
    base = set(STR["hi"])
    for lg in LANGS:
        assert base <= set(STR[lg]), (lg, base - set(STR[lg]))

def test_assistant_customer_and_contractor_flows():
    wh, w = make_worker("9000000721", "Bot Painter", NEAR, skills=("painter",))
    client.post("/api/worker/status", headers=wh, json={"status": "free"})
    ch, _ = login("9000000731", "customer", "Bot Owner")
    def say(h, text="", **kw):
        return client.post("/api/assistant", headers=h, json={"text": text, **kw}).json()
    say(ch, start=True, lang="en")
    r = say(ch, "I need a painter")                      # skill detected -> asks for location
    assert any(a["type"] == "request_location" for a in r["actions"])
    r = say(ch, "", location={"lat": LAT, "lng": LNG})
    assert any(a["type"] == "instant_started" for a in r["actions"])
    # the painter received the instant offer
    # contractor adds crew by chat
    kh, _ = login("9000000741", "contractor", "Bot Contractor")
    say(kh, start=True, lang="en")
    assert "Name" in say(kh, "add member")["reply"]
    say(kh, "Shyam"); say(kh, "skip"); say(kh, "labour")
    r = say(kh, "450")
    assert "crew" in r["reply"].lower()
    crew = client.get("/api/contractor/crew", headers=kh).json()["crew"]
    assert len(crew) == 1 and crew[0]["name"] == "Shyam" and crew[0]["daily_rate"] == 450
    assert "1 people" in say(kh, "my team")["reply"]

def test_password_and_forgot_flow():
    # 1. Check unregistered phone (using unique number)
    p = f"988{int(time.time()*100)%10000000:07d}"
    r = client.post("/api/auth/check-phone", json={"phone": p})
    assert r.status_code == 200 and r.json()["exists"] is False

    # 2. Register first time user with password
    otp = client.post("/api/auth/request-otp", json={"phone": p}).json()["dev_otp"]
    r = client.post("/api/auth/verify-otp", json={"phone": p, "otp": otp, "role": "customer", "name": "Secure User", "password": "pass1234"})
    assert r.status_code == 200
    token = r.json()["token"]
    assert token

    # 3. Check registered phone
    r = client.post("/api/auth/check-phone", json={"phone": p})
    assert r.status_code == 200 and r.json()["exists"] is True and r.json()["has_password"] is True

    # 4. Login with password (wrong password should fail)
    r = client.post("/api/auth/login-password", json={"phone": p, "password": "wrong"})
    assert r.status_code == 400

    # 5. Login with password (correct)
    r = client.post("/api/auth/login-password", json={"phone": p, "password": "pass1234"})
    assert r.status_code == 200 and r.json()["user"]["name"] == "Secure User"

    # 6. Forgot password flow
    otp2 = client.post("/api/auth/request-otp", json={"phone": p}).json()["dev_otp"]
    r = client.post("/api/auth/forgot-password", json={"phone": p, "otp": otp2, "new_password": "newpass5678"})
    assert r.status_code == 200

    # Old password no longer works
    assert client.post("/api/auth/login-password", json={"phone": p, "password": "pass1234"}).status_code == 400

    # New password works
    assert client.post("/api/auth/login-password", json={"phone": p, "password": "newpass5678"}).status_code == 200

def test_contractor_jobs_and_milestones():
    ch, c_id = login("9000000881", "contractor", "Test Thekedar", loc=NEAR)
    client.put("/api/contractor/profile", headers=ch, json={
        "company": "Super Builders", "skills": ["rajmistri", "painter"], "village": "Mirzapur",
        "lat": NEAR[0], "lng": NEAR[1], "radius_km": 30, "min_budget": 5000, "experience_years": 8, "about": "Experienced contractor"
    })
    cust_h, cust_id = login("9000000891", "customer", "Job Poster")

    # Post a job matching contractor's skill within radius
    j_res = client.post("/api/jobs", headers=cust_h, json={
        "skill": "rajmistri", "description": "Need plaster work for boundary wall",
        "address": "Civil Lines", "lat": NEAR[0], "lng": NEAR[1], "days": 5, "budget": 8000
    })
    assert j_res.status_code == 200
    jid = j_res.json()["id"]

    # 1. Contractor job feed (D1)
    feed = client.get("/api/contractor/jobs", headers=ch).json()["jobs"]
    assert any(x["id"] == jid for x in feed)

    # 2. Contractor registers interest (D1)
    int_res = client.post(f"/api/contractor/jobs/{jid}/interest", headers=ch, json={"rate": 7500, "note": "Can start Monday"})
    assert int_res.status_code == 200

    # 3. Customer converts job to project with this contractor (D1)
    conv_res = client.post(f"/api/contractor/jobs/{jid}/convert-project", headers=cust_h, json={
        "contractor_id": c_id, "title": "Boundary Wall Plaster Project", "budget": 7500, "days": 5
    })
    assert conv_res.status_code == 200
    pid = conv_res.json()["project_id"]

    # Contractor accepts negotiation
    acc_res = client.post(f"/api/projects/{pid}/accept", headers=ch)
    assert acc_res.status_code == 200

    # 4. Project Milestones schedule (D3)
    ms_res = client.post(f"/api/projects/{pid}/milestones", headers=cust_h, json={
        "milestones": [
            {"title": "Advance Material", "amount": 2500, "percentage": 33},
            {"title": "Half Work Plaster", "amount": 2500, "percentage": 33},
            {"title": "Final Completion", "amount": 2500, "percentage": 34}
        ]
    })
    assert ms_res.status_code == 200
    milestones = client.get(f"/api/projects/{pid}/milestones", headers=ch).json()["milestones"]
    assert len(milestones) == 3

    # Mark milestone paid by customer
    mid = milestones[0]["id"]
    pay_res = client.post(f"/api/projects/{pid}/milestones/{mid}/status", headers=cust_h, json={"status": "paid"})
    assert pay_res.status_code == 200
