import base64
import hashlib
import hmac
import json
import logging
import time
import urllib.request
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from . import config, firebase_sync
from .common import *
from .db import db
from .realtime import hub, notify
from .security import current_user

logger = logging.getLogger("kaamsetu.payments")
router = APIRouter()


class PaymentOrderReq(BaseModel):
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    milestone_id: Optional[int] = None
    amount_paise: int = Field(..., gt=0, le=100_000_000)  # up to 10 Lakhs
    method: str = Field("online", pattern="^(online|cash)$")


class PaymentVerifyReq(BaseModel):
    payment_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class CashConfirmReq(BaseModel):
    note: Optional[str] = ""


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str, secret: str) -> bool:
    if not secret:
        # In mock / test mode when secret is not configured
        return True
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def create_razorpay_order(amount_paise: int, receipt: str) -> str:
    if not (config.RAZORPAY_KEY_ID and config.RAZORPAY_KEY_SECRET):
        # Mock order ID for local dev / testing
        return f"order_mock_{int(time.time())}_{uuid.uuid4().hex[:8]}"

    url = "https://api.razorpay.com/v1/orders"
    payload = json.dumps({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt[:40],
        "payment_capture": 1
    }).encode("utf-8")

    auth_str = f"{config.RAZORPAY_KEY_ID}:{config.RAZORPAY_KEY_SECRET}"
    b64_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {b64_auth}"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["id"]
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        if config.DEV_MODE:
            return f"order_mock_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        raise HTTPException(502, "Payment gateway unavailable. Please try again or choose Cash.")


@router.post("/api/payments/order")
async def create_payment_order(req: PaymentOrderReq, u=Depends(current_user)):
    """Create a payment intent/order for booking advance or milestone."""
    need_role(u, "customer")
    now = time.time()
    worker_id = None

    with db() as c:
        if req.booking_id:
            b = c.execute("SELECT * FROM bookings WHERE id=?", (req.booking_id,)).fetchone()
            if not b:
                raise HTTPException(404, "Booking not found")
            if b["customer_id"] != u["id"]:
                raise HTTPException(403, "Not your booking")
            worker_id = b["worker_id"]
            # Booking token fee: fixed ₹10 (1000 paise) or between ₹10 and booking total
            if req.amount_paise < 1000:
                raise HTTPException(400, "Minimum booking confirmation fee is ₹10 (1000 paise)")
        elif req.milestone_id:
            m = c.execute("SELECT m.*, p.customer_id, p.contractor_id FROM project_milestones m JOIN projects p ON p.id=m.project_id WHERE m.id=?",
                          (req.milestone_id,)).fetchone()
            if not m:
                raise HTTPException(404, "Milestone not found")
            if m["customer_id"] != u["id"]:
                raise HTTPException(403, "Not your project milestone")
            worker_id = m["contractor_id"]
            req.project_id = m["project_id"]
        elif req.project_id:
            p = c.execute("SELECT * FROM projects WHERE id=?", (req.project_id,)).fetchone()
            if not p:
                raise HTTPException(404, "Project not found")
            if p["customer_id"] != u["id"]:
                raise HTTPException(403, "Not your project")
            worker_id = p["contractor_id"]
        else:
            raise HTTPException(400, "booking_id, milestone_id, or project_id required")

        fee_paise = int(req.amount_paise * (config.PLATFORM_FEE_PCT / 100.0))
        net_paise = max(0, req.amount_paise - fee_paise)

        if req.method == "cash":
            cur = c.execute(
                "INSERT INTO payments(booking_id, project_id, milestone_id, customer_id, worker_id, amount_paise, fee_paise, net_paise, currency, status, gateway, payment_method, created_at, updated_at) "
                "VALUES(?,?,?,?,?,?,?,?,'INR','cash_pending','cash','cash',?,?)",
                (req.booking_id, req.project_id, req.milestone_id, u["id"], worker_id, req.amount_paise, fee_paise, net_paise, now, now)
            )
            pid = cur.lastrowid
            if worker_id:
                await notify(worker_id, {
                    "type": "payment_cash_pending",
                    "payment_id": pid,
                    "booking_id": req.booking_id,
                    "amount": req.amount_paise // 100,
                    "title": "नकद भुगतान (Cash) लंबित",
                    "body": f"ग्राहक ₹{req.amount_paise // 100} नकद भुगतान करेंगे।"
                })
            return {
                "id": pid,
                "status": "cash_pending",
                "amount_paise": req.amount_paise,
                "fee_paise": fee_paise,
                "net_paise": net_paise,
                "currency": "INR",
                "method": "cash"
            }

        # Online (Razorpay)
        receipt = f"mb_{int(now)}_{u['id']}_{req.booking_id or req.project_id or 0}"
        gateway_order_id = create_razorpay_order(req.amount_paise, receipt)

        cur = c.execute(
            "INSERT INTO payments(booking_id, project_id, milestone_id, customer_id, worker_id, amount_paise, fee_paise, net_paise, currency, status, gateway, gateway_order_id, payment_method, created_at, updated_at) "
            "VALUES(?,?,?,?,?,?,?,?,'INR','created','razorpay',?,'online',?,?)",
            (req.booking_id, req.project_id, req.milestone_id, u["id"], worker_id, req.amount_paise, fee_paise, net_paise, gateway_order_id, now, now)
        )
        pid = cur.lastrowid

    return {
        "id": pid,
        "payment_id": pid,
        "status": "created",
        "amount_paise": req.amount_paise,
        "fee_paise": fee_paise,
        "net_paise": net_paise,
        "currency": "INR",
        "gateway_order_id": gateway_order_id,
        "order_id": gateway_order_id,
        "razorpay_key": config.RAZORPAY_KEY_ID or "rzp_test_mock",
        "key_id": config.RAZORPAY_KEY_ID or "rzp_test_mock",
        "method": "online"
    }


@router.post("/api/payments/verify")
async def verify_payment(req: PaymentVerifyReq, u=Depends(current_user)):
    """Verify payment signature from Razorpay frontend SDK and move to escrow (held)."""
    now = time.time()
    with db() as c:
        p = c.execute("SELECT * FROM payments WHERE id=?", (req.payment_id,)).fetchone()
        if not p:
            raise HTTPException(404, "Payment record not found")
        if p["customer_id"] != u["id"]:
            raise HTTPException(403, "Not your payment")
        if p["status"] == "held":
            return {"ok": True, "status": "held", "payment_id": p["id"]}
        if p["status"] != "created":
            raise HTTPException(400, f"Payment is in status '{p['status']}', cannot verify")

        # SECURITY: Validate that client-supplied order_id matches what we saved in DB
        # This prevents substituting a cheap order to verify an expensive one
        p_dict = dict(p)
        saved_order_id = p_dict.get("gateway_order_id") or ""
        if saved_order_id and saved_order_id != req.razorpay_order_id:
            logger.warning(
                "Payment %s: order_id mismatch — DB has '%s' but client sent '%s' (user %s)",
                req.payment_id, saved_order_id, req.razorpay_order_id, u["id"]
            )
            raise HTTPException(400, "Order ID mismatch — verification rejected")

        # SECURITY: Signature MUST be verified in production. In DEV_MODE allow bypass for mock payments.
        if config.RAZORPAY_KEY_SECRET:
            valid = verify_razorpay_signature(
                req.razorpay_order_id, req.razorpay_payment_id,
                req.razorpay_signature, config.RAZORPAY_KEY_SECRET
            )
            if not valid:
                logger.warning("Invalid Razorpay signature for payment %s user %s", req.payment_id, u["id"])
                raise HTTPException(400, "Invalid payment signature — verification failed")
        elif not config.DEV_MODE:
            # Production with no key set: refuse to silently bypass
            logger.error("RAZORPAY_KEY_SECRET not set in production — blocking verify call")
            raise HTTPException(503, "Payment gateway not configured. Contact support.")

        c.execute(
            "UPDATE payments SET status='held', gateway_payment_id=?, updated_at=? WHERE id=?",
            (req.razorpay_payment_id, now, req.payment_id)
        )
        if p["milestone_id"]:
            c.execute("UPDATE project_milestones SET status='paid' WHERE id=?", (p["milestone_id"],))

    # Notify worker that money is in escrow
    if p["worker_id"]:
        await notify(p["worker_id"], {
            "type": "payment_held",
            "payment_id": p["id"],
            "booking_id": p["booking_id"],
            "amount": p["amount_paise"] // 100,
            "title": "एडवांस सुरक्षित (Escrow)",
            "body": f"₹{p['amount_paise'] // 100} एस्क्रो में सुरक्षित जमा हो गए हैं। काम पूरा होने पर सीधे जारी होंगे।"
        })

    return {"ok": True, "status": "held", "payment_id": p["id"]}


@router.post("/api/payments/webhook")
async def payment_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    """Razorpay Webhook listener."""
    body = await request.body()
    # SECURITY: Always require webhook signature. Without it, any party can fake payment events.
    if not config.RAZORPAY_WEBHOOK_SECRET:
        if not config.DEV_MODE:
            logger.error("RAZORPAY_WEBHOOK_SECRET not set — rejecting all webhook calls in production")
            raise HTTPException(503, "Webhook not configured")
        # DEV_MODE: accept without signature (for local testing only)
        logger.warning("DEV_MODE: accepting webhook without secret validation")
    else:
        if not x_razorpay_signature:
            raise HTTPException(400, "Missing X-Razorpay-Signature header")
        expected = hmac.new(config.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, x_razorpay_signature):
            raise HTTPException(400, "Invalid webhook signature")

    try:
        data = json.loads(body.decode("utf-8"))
        event = data.get("event")
        now = time.time()
        if event in ("order.paid", "payment.captured"):
            payment_entity = data.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            pay_id = payment_entity.get("id")
            if order_id:
                with db() as c:
                    p = c.execute("SELECT * FROM payments WHERE gateway_order_id=?", (order_id,)).fetchone()
                    if p and p["status"] == "created":
                        c.execute("UPDATE payments SET status='held', gateway_payment_id=?, updated_at=? WHERE id=?",
                                  (pay_id or "", now, p["id"]))
                        if p["milestone_id"]:
                            c.execute("UPDATE project_milestones SET status='paid' WHERE id=?", (p["milestone_id"],))
                        if p["worker_id"]:
                            await notify(p["worker_id"], {
                                "type": "payment_held",
                                "payment_id": p["id"],
                                "booking_id": p["booking_id"],
                                "amount": p["amount_paise"] // 100,
                                "title": "एडवांस सुरक्षित",
                                "body": f"₹{p['amount_paise'] // 100} एस्क्रो में सुरक्षित जमा हैं।"
                            })
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        return {"status": "error"}

    return {"status": "ok"}


@router.post("/api/payments/{payment_id}/cash-confirm")
async def confirm_cash_payment(payment_id: int, req: CashConfirmReq, u=Depends(current_user)):
    """Worker or Customer confirms physical cash exchange."""
    now = time.time()
    with db() as c:
        p = c.execute("SELECT * FROM payments WHERE id=?", (payment_id,)).fetchone()
        if not p:
            raise HTTPException(404, "Payment not found")
        if u["id"] not in (p["customer_id"], p["worker_id"]):
            raise HTTPException(403, "Not party to this payment")
        if p["status"] not in ("cash_pending", "created"):
            raise HTTPException(400, f"Cannot confirm cash in status {p['status']}")

        c.execute("UPDATE payments SET status='cash_confirmed', updated_at=? WHERE id=?", (now, payment_id))
        if p["milestone_id"]:
            c.execute("UPDATE project_milestones SET status='paid' WHERE id=?", (p["milestone_id"],))

    other_user = p["worker_id"] if u["id"] == p["customer_id"] else p["customer_id"]
    if other_user:
        await notify(other_user, {
            "type": "payment_cash_confirmed",
            "payment_id": payment_id,
            "booking_id": p["booking_id"],
            "amount": p["amount_paise"] // 100,
            "title": "नकद भुगतान पुष्ट हुआ",
            "body": f"₹{p['amount_paise'] // 100} नकद भुगतान की पुष्टि हो गई है।"
        })

    return {"ok": True, "status": "cash_confirmed"}


@router.post("/api/payments/{payment_id}/release")
async def release_escrow_payment(payment_id: int, u=Depends(current_user)):
    """Release funds held in escrow to worker upon satisfactory completion."""
    now = time.time()
    with db() as c:
        p = c.execute("SELECT * FROM payments WHERE id=?", (payment_id,)).fetchone()
        if not p:
            raise HTTPException(404, "Payment not found")
        # Can be released by customer or admin
        if u["id"] != p["customer_id"] and not u.get("is_admin"):
            raise HTTPException(403, "Only customer or admin can release escrow")
        if p["status"] != "held":
            raise HTTPException(400, f"Payment is in status {p['status']}, expected 'held'")

        c.execute("UPDATE payments SET status='released', updated_at=? WHERE id=?", (now, payment_id))
        if p["milestone_id"]:
            c.execute("UPDATE project_milestones SET status='released' WHERE id=?", (p["milestone_id"],))

        if p["worker_id"]:
            c.execute(
                "INSERT INTO payouts(user_id, payment_id, amount_paise, status, created_at) VALUES(?,?,?,'pending',?)",
                (p["worker_id"], payment_id, p["net_paise"], now)
            )

    if p["worker_id"]:
        await notify(p["worker_id"], {
            "type": "payment_released",
            "payment_id": payment_id,
            "booking_id": p["booking_id"],
            "amount": p["net_paise"] // 100,
            "title": "भुगतान जारी हुआ (Payout Released)",
            "body": f"₹{p['net_paise'] // 100} आपके बैंक खाते / UPI में ट्रांसफर किए जा रहे हैं।"
        })

    return {"ok": True, "status": "released"}


@router.get("/api/payments/{payment_id}/receipt")
def get_payment_receipt(payment_id: int, u=Depends(current_user)):
    """Return structured receipt details."""
    with db() as c:
        p = c.execute(
            "SELECT p.*, "
            "c.name as customer_name, c.phone as customer_phone, "
            "w.name as worker_name, w.phone as worker_phone "
            "FROM payments p "
            "LEFT JOIN users c ON c.id=p.customer_id "
            "LEFT JOIN users w ON w.id=p.worker_id "
            "WHERE p.id=?",
            (payment_id,)
        ).fetchone()
        if not p:
            raise HTTPException(404, "Payment not found")
        if u["id"] not in (p["customer_id"], p["worker_id"]) and not u.get("is_admin"):
            raise HTTPException(403, "Access denied")

        return {
            "id": p["id"],
            "booking_id": p["booking_id"],
            "project_id": p["project_id"],
            "amount": p["amount_paise"] / 100.0,
            "fee": p["fee_paise"] / 100.0,
            "net": p["net_paise"] / 100.0,
            "currency": p["currency"],
            "status": p["status"],
            "method": p["payment_method"],
            "gateway": p["gateway"],
            "gateway_payment_id": p["gateway_payment_id"],
            "customer_name": p["customer_name"] or "Customer",
            "worker_name": p["worker_name"] or "Worker",
            "created_at": p["created_at"],
            "updated_at": p["updated_at"]
        }


@router.get("/api/payments/my")
def my_payments(u=Depends(current_user)):
    """List recent payments for current user."""
    with db() as c:
        rows = c.execute(
            "SELECT p.*, "
            "c.name as customer_name, w.name as worker_name "
            "FROM payments p "
            "LEFT JOIN users c ON c.id=p.customer_id "
            "LEFT JOIN users w ON w.id=p.worker_id "
            "WHERE p.customer_id=? OR p.worker_id=? "
            "ORDER BY p.id DESC LIMIT 50",
            (u["id"], u["id"])
        ).fetchall()
        return {"payments": [dict(r) for r in rows]}


@router.get("/api/payments/booking/{booking_id}")
def booking_payment(booking_id: int, u=Depends(current_user)):
    """Get active payment for a specific booking."""
    with db() as c:
        p = c.execute(
            "SELECT * FROM payments WHERE booking_id=? ORDER BY id DESC LIMIT 1",
            (booking_id,)
        ).fetchone()
        if not p:
            return {"payment": None}
        if u["id"] not in (p["customer_id"], p["worker_id"]) and not u.get("is_admin"):
            raise HTTPException(403, "Access denied")
        return {"payment": dict(p)}
