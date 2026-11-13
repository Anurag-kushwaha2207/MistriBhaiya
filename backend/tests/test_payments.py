import asyncio, hashlib, hmac, json, os, sys, tempfile, time
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if "DB_PATH" not in os.environ:
    os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t_pay.db")
os.environ["DEV_MODE"] = "1"
os.environ["RAZORPAY_KEY_ID"] = "rzp_test_testkey"
os.environ["RAZORPAY_KEY_SECRET"] = "secret123456"
os.environ["RAZORPAY_WEBHOOK_SECRET"] = "whsecret123456"

from fastapi.testclient import TestClient
from app.main import app
from app.db import init_db, db

init_db()
client = TestClient(app)

LAT, LNG = 26.4500, 80.3300

def get_auth(phone, role, name):
    r = client.post("/api/auth/request-otp", json={"phone": phone})
    assert r.status_code == 200
    otp = r.json()["dev_otp"]
    v_body = {"phone": phone, "otp": otp, "role": role, "name": name}
    if role in ("worker", "contractor"):
        v_body["lat"], v_body["lng"] = LAT, LNG
    r = client.post("/api/auth/verify", json=v_body)
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["token"]}, r.json()["user"]["id"]


def test_payment_escrow_and_completion_flow():
    # 1. Setup worker and customer
    w_hdr, w_id = get_auth("9811000001", "worker", "Raju Mistri")
    client.put("/api/worker/profile", headers=w_hdr, json={
        "skills": ["rajmistri"], "daily_rate": 600, "experience_years": 4, "village": "Kanpur", "lat": LAT, "lng": LNG, "radius_km": 10
    })
    client.post("/api/worker/status", headers=w_hdr, json={"status": "free"})

    c_hdr, c_id = get_auth("9811000002", "customer", "Sunil Customer")

    # 2. Customer creates booking
    r_book = client.post("/api/bookings", headers=c_hdr, json={
        "worker_id": w_id, "skill": "rajmistri", "start_date": "2026-11-10", "days": 2, "agreed_rate": 600, "lat": LAT, "lng": LNG
    })
    assert r_book.status_code == 200
    bid = r_book.json()["id"]

    # Worker accepts booking
    client.post(f"/api/bookings/{bid}/respond", headers=w_hdr, json={"accept": True})

    # 3. Customer creates payment order for advance (e.g. ₹1200 = 120000 paise)
    r_order = client.post("/api/payments/order", headers=c_hdr, json={
        "booking_id": bid,
        "amount_paise": 120000,
        "method": "online"
    })
    assert r_order.status_code == 200
    pay_data = r_order.json()
    assert pay_data["status"] == "created"
    assert pay_data["amount_paise"] == 120000
    assert pay_data["fee_paise"] == 6000 # 5% of 120000
    assert pay_data["net_paise"] == 114000
    pid = pay_data["id"]
    order_id = pay_data["gateway_order_id"]

    # 4. Client verification callback with valid HMAC signature
    fake_payment_id = "pay_mock_12345"
    sign_msg = f"{order_id}|{fake_payment_id}".encode("utf-8")
    sig = hmac.new(b"secret123456", sign_msg, hashlib.sha256).hexdigest()

    r_verify = client.post("/api/payments/verify", headers=c_hdr, json={
        "payment_id": pid,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": fake_payment_id,
        "razorpay_signature": sig
    })
    assert r_verify.status_code == 200
    assert r_verify.json()["status"] == "held"

    # Verify payment status in DB is now held
    with db() as c:
        p = c.execute("SELECT * FROM payments WHERE id=?", (pid,)).fetchone()
        assert p["status"] == "held"
        assert p["gateway_payment_id"] == fake_payment_id

    # 5. Check receipt
    r_rcpt = client.get(f"/api/payments/{pid}/receipt", headers=c_hdr)
    assert r_rcpt.status_code == 200
    assert r_rcpt.json()["amount"] == 1200.0
    assert r_rcpt.json()["fee"] == 60.0
    assert r_rcpt.json()["net"] == 1140.0
    assert r_rcpt.json()["status"] == "held"

    # Start work using OTP
    b_info = client.get("/api/bookings/mine", headers=c_hdr).json()["bookings"][0]
    otp = b_info["start_otp"]
    r_start = client.post(f"/api/bookings/{bid}/start", headers=w_hdr, json={"otp": otp})
    assert r_start.status_code == 200

    # 6. Complete booking (Worker marks work_done, Customer confirms completion)
    r_done = client.post(f"/api/bookings/{bid}/complete", headers=w_hdr)
    assert r_done.status_code == 200
    assert r_done.json()["status"] == "work_done"

    r_confirm = client.post(f"/api/bookings/{bid}/complete", headers=c_hdr)
    assert r_confirm.status_code == 200
    assert r_confirm.json()["status"] == "completed"

    # Escrow payment should now be automatically released to worker payout!
    with db() as c:
        p_after = c.execute("SELECT * FROM payments WHERE id=?", (pid,)).fetchone()
        assert p_after["status"] == "released"
        payout = c.execute("SELECT * FROM payouts WHERE payment_id=?", (pid,)).fetchone()
        assert payout is not None
        assert payout["user_id"] == w_id
        assert payout["amount_paise"] == 114000


def test_cash_payment_flow():
    w_hdr, w_id = get_auth("9811000003", "worker", "Kishan Mistri")
    client.put("/api/worker/profile", headers=w_hdr, json={
        "skills": ["plumber"], "daily_rate": 500, "experience_years": 2, "village": "Lucknow", "lat": LAT, "lng": LNG, "radius_km": 10
    })
    client.post("/api/worker/status", headers=w_hdr, json={"status": "free"})
    c_hdr, c_id = get_auth("9811000004", "customer", "Anil Customer")

    r_book = client.post("/api/bookings", headers=c_hdr, json={
        "worker_id": w_id, "skill": "plumber", "start_date": "2026-11-20", "days": 1, "agreed_rate": 500, "lat": LAT, "lng": LNG
    })
    assert r_book.status_code == 200
    bid = r_book.json()["id"]

    # Customer chooses cash payment
    r_cash = client.post("/api/payments/order", headers=c_hdr, json={
        "booking_id": bid,
        "amount_paise": 50000,
        "method": "cash"
    })
    assert r_cash.status_code == 200
    pid = r_cash.json()["id"]
    assert r_cash.json()["status"] == "cash_pending"

    # Worker confirms cash received
    r_conf = client.post(f"/api/payments/{pid}/cash-confirm", headers=w_hdr, json={"note": "Received 500 in cash"})
    assert r_conf.status_code == 200
    assert r_conf.json()["status"] == "cash_confirmed"


def test_payment_webhook_flow():
    w_hdr, w_id = get_auth("9811000005", "worker", "Gopal Painter")
    client.put("/api/worker/profile", headers=w_hdr, json={
        "skills": ["painter"], "daily_rate": 700, "experience_years": 3, "village": "Noida", "lat": LAT, "lng": LNG, "radius_km": 10
    })
    c_hdr, c_id = get_auth("9811000006", "customer", "Pooja Customer")

    r_book = client.post("/api/bookings", headers=c_hdr, json={
        "worker_id": w_id, "skill": "painter", "start_date": "2026-11-15", "days": 1, "agreed_rate": 700, "lat": LAT, "lng": LNG
    })
    bid = r_book.json()["id"]

    r_order = client.post("/api/payments/order", headers=c_hdr, json={
        "booking_id": bid,
        "amount_paise": 70000,
        "method": "online"
    })
    pid = r_order.json()["id"]
    order_id = r_order.json()["gateway_order_id"]

    # Simulate Razorpay Webhook event
    webhook_body = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_hook_9999",
                    "order_id": order_id,
                    "amount": 70000,
                    "status": "captured"
                }
            }
        }
    }).encode("utf-8")

    sig = hmac.new(b"whsecret123456", webhook_body, hashlib.sha256).hexdigest()

    r_hook = client.post(
        "/api/payments/webhook",
        content=webhook_body,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig}
    )
    assert r_hook.status_code == 200

    # Payment should be marked held
    with db() as c:
        p = c.execute("SELECT * FROM payments WHERE id=?", (pid,)).fetchone()
        assert p["status"] == "held"
        assert p["gateway_payment_id"] == "pay_hook_9999"


def test_my_payments_and_booking_endpoint():
    c_hdr, c_id = get_auth("9811000007", "customer", "Vikas Customer")
    r = client.get("/api/payments/my", headers=c_hdr)
    assert r.status_code == 200
    assert "payments" in r.json()
