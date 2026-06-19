from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import razorpay
import json
import hmac
import hashlib
from app.websocket_manager import manager

from app.database import get_db
from app.config import settings
from app.models.models import User, UserRole, Fee, FeeStructure, Student, PaymentStatus
from app.auth.auth_handler import get_current_user

router = APIRouter(prefix="/api/payments", tags=["Online Payments"])

client = None
if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _record_payment(fee_ids: list[int], transaction_id: str, db: Session) -> dict:
    fees = db.query(Fee).filter(Fee.id.in_(fee_ids)).all()
    updated = []
    for fee in fees:
        balance = fee.amount - fee.paid_amount
        if balance > 0:
            fee.paid_amount += balance
            fee.paid_date = date.today()
            fee.status = PaymentStatus.PAID
            fee.payment_method = "razorpay_online"
            fee.transaction_id = transaction_id
            fee.receipt_no = f"RCP{date.today().strftime('%Y%m%d')}{fee.id:04d}"
            updated.append(fee.id)
    db.commit()
    return {"message": "Payment recorded", "updated_fee_ids": updated}


class CreateOrderRequest(BaseModel):
    fee_ids: list[int]
    amount: Optional[float] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    fee_ids: list[int]


@router.get("/config")
def get_payment_config(current_user: User = Depends(get_current_user)):
    has_keys = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)
    return {
        "key_id": settings.RAZORPAY_KEY_ID or "",
        "enabled": True,
        "demo_mode": not has_keys,
    }


class DemoPayRequest(BaseModel):
    fee_ids: list[int]


@router.post("/demo-pay")
def demo_pay(req: DemoPayRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fees = db.query(Fee).filter(Fee.id.in_(req.fee_ids)).all()
    if not fees:
        raise HTTPException(status_code=404, detail="No fees found")

    updated = []
    for fee in fees:
        balance = fee.amount - fee.paid_amount
        if balance > 0:
            fee.paid_amount += balance
            fee.paid_date = date.today()
            fee.status = PaymentStatus.PAID
            fee.payment_method = "demo_online"
            fee.transaction_id = f"DEMO_{date.today().strftime('%Y%m%d')}_{fee.id}"
            fee.receipt_no = f"RCP{date.today().strftime('%Y%m%d')}{fee.id:04d}"
            updated.append(fee.id)

    db.commit()
    
    import asyncio
    try:
        asyncio.create_task(manager.send_to_user(current_user.id, {
            "type": "payment_update",
            "fee_ids": updated,
            "status": "paid"
        }))
    except Exception:
        pass
    
    return {"message": "Demo payment recorded", "updated_fee_ids": updated}


@router.post("/create-order")
def create_order(req: CreateOrderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not client:
        raise HTTPException(status_code=503, detail="Payment gateway not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env")

    fees = db.query(Fee).filter(Fee.id.in_(req.fee_ids)).all()
    if not fees:
        raise HTTPException(status_code=404, detail="No fees found")

    total_amount = sum(int((f.amount - f.paid_amount) * 100) for f in fees)
    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="All selected fees are already paid")

    order = client.order.create({
        "amount": total_amount,
        "currency": "INR",
        "receipt": f"fee_{'_'.join(str(f.id) for f in fees)}",
        "notes": {
            "student_id": str(fees[0].student_id),
            "processed_by": current_user.username,
        }
    })

    return {
        "order_id": order["id"],
        "amount": total_amount,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
    }


@router.post("/verify")
def verify_payment(req: VerifyPaymentRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        (req.razorpay_order_id + "|" + req.razorpay_payment_id).encode(),
        hashlib.sha256
    ).hexdigest()

    if expected_signature != req.razorpay_signature:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    return _record_payment(req.fee_ids, req.razorpay_payment_id, db)


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_KEY_SECRET
    body = await request.body()
    received_signature = request.headers.get("X-Razorpay-Signature", "")

    expected_signature = hmac.new(
        webhook_secret.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    if received_signature != expected_signature:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(body)
    event = payload.get("event", "")

    if event == "payment.captured":
        payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment.get("order_id", "")
        payment_id = payment.get("id", "")
        notes = payment.get("notes", {})

        if order_id and payment_id:
            fees = db.query(Fee).filter(
                Fee.transaction_id == payment_id,
                Fee.status != PaymentStatus.PAID
            ).all()
            for fee in fees:
                balance = fee.amount - fee.paid_amount
                fee.paid_amount += balance
                fee.paid_date = date.today()
                fee.status = PaymentStatus.PAID
                fee.payment_method = "razorpay_online"
            db.commit()

    return {"status": "ok"}
