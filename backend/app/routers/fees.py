from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional
from datetime import date, datetime
from app.database import get_db
from app.models.models import User, UserRole, Fee, FeeStructure, Student, Class, PaymentStatus
from app.schemas.schemas import FeeStructureCreate, FeeCreate, FeePayment, FeeOut, FeeUpdate
from app.auth.auth_handler import get_current_user
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/fees", tags=["Fee Management"])

# --- Fee Structure ---
@router.get("/structures")
def get_fee_structures(class_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(FeeStructure)
    if class_id:
        query = query.filter(FeeStructure.class_id == class_id)
    result = []
    for f in query.limit(200).all():
        cls = db.query(Class).filter(Class.id == f.class_id).first()
        result.append({
            "id": f.id, "class_id": f.class_id, "class_name": cls.name if cls else None,
            "fee_type": f.fee_type, "amount": f.amount, "frequency": f.frequency,
            "due_day": f.due_day, "due_date": f"{f.due_day}"
        })
    return result

@router.post("/structures")
def create_fee_structure(req: FeeStructureCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(FeeStructure).filter(
        FeeStructure.class_id == req.class_id,
        FeeStructure.fee_type == req.fee_type
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Fee structure already exists for this class and fee type")
    structure = FeeStructure(class_id=req.class_id, fee_type=req.fee_type, amount=req.amount, frequency=req.frequency, due_day=req.due_day)
    db.add(structure)
    db.commit()
    return {"message": "Fee structure created", "id": structure.id}

@router.put("/structures/{structure_id}")
def update_fee_structure(structure_id: int, req: FeeStructureCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    structure = db.query(FeeStructure).filter(FeeStructure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    structure.class_id = req.class_id
    structure.fee_type = req.fee_type
    structure.amount = req.amount
    structure.frequency = req.frequency
    structure.due_day = req.due_day
    db.commit()
    return {"message": "Fee structure updated"}

@router.delete("/structures/{structure_id}")
def delete_fee_structure(structure_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    structure = db.query(FeeStructure).filter(FeeStructure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    db.delete(structure)
    db.commit()
    return {"message": "Fee structure deleted"}

# --- Fees ---
@router.get("/", response_model=dict)
def get_fees(
    student_id: Optional[int] = None, class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    status: Optional[str] = None, search: Optional[str] = None,
    page: int = 1, per_page: int = 50,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    query = db.query(Fee)
    needs_student_join = (search is not None) or (class_id is not None) or (section_id is not None)
    
    if needs_student_join:
        query = query.join(Student)
    
    if search:
        query = query.filter(
            (Student.first_name.ilike(f"%{search}%")) |
            (Student.last_name.ilike(f"%{search}%")) |
            (Student.student_id.ilike(f"%{search}%"))
        )
    if student_id:
        query = query.filter(Fee.student_id == student_id)
    if class_id:
        query = query.filter(Student.class_id == class_id)
    if section_id:
        query = query.filter(Student.section_id == section_id)
    if status:
        query = query.filter(Fee.status == status)
    
    total = query.count()
    fees = query.order_by(Fee.due_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    result = []
    for f in fees:
        out = FeeOut.model_validate(f)
        student = db.query(Student).filter(Student.id == f.student_id).first()
        if student:
            out.student_name = f"{student.first_name} {student.last_name}"
            cls = db.query(Class).filter(Class.id == student.class_id).first()
            out.class_name = cls.name if cls else None
        result.append(out)
    
    return {
        "fees": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
        "total_collected": float(db.query(func.sum(Fee.amount)).filter(Fee.status == "paid").scalar() or 0),
        "total_pending": float(db.query(func.sum(Fee.amount - Fee.paid_amount)).filter(Fee.status != "paid").scalar() or 0)
    }

@router.post("/create")
def create_fee(req: FeeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Fee).filter(
        Fee.student_id == req.student_id,
        Fee.fee_type == req.fee_type,
        Fee.due_date == req.due_date
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Fee record already exists for this student, fee type, and due date")
    fee = Fee(
        student_id=req.student_id,
        fee_type=req.fee_type,
        amount=req.amount,
        due_date=req.due_date,
        status=PaymentStatus.PENDING
    )
    db.add(fee)
    db.commit()
    return {"message": "Fee record created", "id": fee.id}

@router.post("/generate-monthly")
def generate_monthly_fees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), class_id: Optional[int] = None, month: Optional[int] = None, year: Optional[int] = None):
    today = date.today()
    month = month or today.month
    year = year or today.year
    
    target_classes = [class_id] if class_id else [c.id for c in db.query(FeeStructure.class_id).distinct().all()]
    
    count = 0
    for cid in target_classes:
        structures = db.query(FeeStructure).filter(FeeStructure.class_id == cid).all()
        if not structures:
            continue
        batch_size = 200
        offset = 0
        while True:
            batch = db.query(Student).filter(Student.class_id == cid, Student.is_active == True).offset(offset).limit(batch_size).all()
            if not batch:
                break
            for student in batch:
                for struct in structures:
                    due_date = date(year, month, min(struct.due_day, 28))
                    month_start = date(year, month, 1)
                    if month == 12:
                        month_end = date(year + 1, 1, 1)
                    else:
                        month_end = date(year, month + 1, 1)
                    existing = db.query(Fee).filter(
                        Fee.student_id == student.id,
                        Fee.fee_type == struct.fee_type,
                        Fee.due_date >= month_start,
                        Fee.due_date < month_end
                    ).first()
                    if not existing:
                        fee = Fee(
                            student_id=student.id,
                            fee_type=struct.fee_type,
                            amount=struct.amount,
                            due_date=due_date,
                            status=PaymentStatus.PENDING
                        )
                        db.add(fee)
                        count += 1
            offset += batch_size
            db.flush()
    
    db.commit()
    return {"message": f"Generated {count} fee records"}

@router.post("/cleanup-duplicates")
def cleanup_duplicates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("""
        DELETE FROM fee_structures WHERE id NOT IN (
            SELECT MIN(id) FROM fee_structures GROUP BY class_id, fee_type
        )
    """))
    db.execute(text("""
        DELETE FROM fees WHERE id NOT IN (
            SELECT MIN(id) FROM fees GROUP BY student_id, fee_type, due_date
        )
    """))
    db.commit()
    structs = db.query(func.count(FeeStructure.id)).scalar()
    fees = db.query(func.count(Fee.id)).scalar()
    return {"message": "Duplicates cleaned", "fee_structures": structs, "fees": fees}

@router.post("/ensure-constraints")
def ensure_unique_constraints(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for sql in [
        "ALTER TABLE fee_structures ADD CONSTRAINT uq_fee_structure UNIQUE (class_id, fee_type)",
        "ALTER TABLE fees ADD CONSTRAINT uq_fee UNIQUE (student_id, fee_type, due_date)"
    ]:
        try:
            db.execute(text(sql))
        except Exception:
            pass
    db.commit()
    return {"message": "Unique constraints ensured (or already exist)"}

@router.get("/my-fees", response_model=dict)
def get_my_fees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="No student profile linked to this user")
    fees = db.query(Fee).filter(Fee.student_id == student.id).order_by(Fee.due_date.desc()).limit(100).all()
    total_due = sum(f.amount - f.paid_amount for f in fees if f.status != "paid")
    return {
        "student_id": student.id,
        "student_name": f"{student.first_name} {student.last_name}",
        "class_name": student.class_ref.name if student.class_ref else None,
        "total_due": float(total_due),
        "fees": [FeeOut.model_validate(f) for f in fees],
    }

@router.put("/{fee_id}", response_model=FeeOut)
def update_fee(fee_id: int, req: FeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(fee, key, value)
    db.commit()
    db.refresh(fee)
    out = FeeOut.model_validate(fee)
    student = db.query(Student).filter(Student.id == fee.student_id).first()
    if student:
        out.student_name = f"{student.first_name} {student.last_name}"
        cls = db.query(Class).filter(Class.id == student.class_id).first()
        out.class_name = cls.name if cls else None
    return out

@router.delete("/{fee_id}")
def delete_fee(fee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    db.delete(fee)
    db.commit()
    return {"message": "Fee deleted"}

@router.get("/{fee_id}", response_model=FeeOut)
def get_fee(fee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    out = FeeOut.model_validate(fee)
    student = db.query(Student).filter(Student.id == fee.student_id).first()
    if student:
        out.student_name = f"{student.first_name} {student.last_name}"
        cls = db.query(Class).filter(Class.id == student.class_id).first()
        out.class_name = cls.name if cls else None
    return out

@router.post("/pay")
def pay_fee(req: FeePayment, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = db.query(Fee).filter(Fee.id == req.fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    
    fee.paid_amount += req.amount
    fee.paid_date = date.today()
    fee.payment_method = req.payment_method
    fee.transaction_id = req.transaction_id
    
    if fee.paid_amount >= fee.amount:
        fee.status = PaymentStatus.PAID
    else:
        fee.status = PaymentStatus.PARTIAL
    
    # Generate receipt number
    fee.receipt_no = f"RCP{date.today().strftime('%Y%m%d')}{fee.id:04d}"
    
    db.commit()
    return {"message": "Payment recorded", "receipt_no": fee.receipt_no, "balance": fee.amount - fee.paid_amount}

@router.get("/{student_id}/dues")
def get_student_dues(student_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fees = db.query(Fee).filter(Fee.student_id == student_id).order_by(Fee.due_date).all()
    total_due = sum(f.amount - f.paid_amount for f in fees if f.status != "paid")
    
    return {
        "student_id": student_id,
        "total_due": float(total_due),
        "fees": [FeeOut.model_validate(f) for f in fees]
    }

@router.get("/{fee_id}/receipt")
def download_receipt(fee_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    
    student = db.query(Student).filter(Student.id == fee.student_id).first()
    
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 20)
    c.drawString(200, height - 50, "SCHOOL ERP")
    c.setFont("Helvetica", 14)
    c.drawString(200, height - 70, "Payment Receipt")
    
    c.setFont("Helvetica", 11)
    y = height - 120
    c.drawString(50, y, f"Receipt No: {fee.receipt_no or 'N/A'}")
    c.drawString(350, y, f"Date: {fee.paid_date or 'N/A'}")
    y -= 30
    c.drawString(50, y, f"Student ID: {student.student_id if student else 'N/A'}")
    c.drawString(350, y, f"Student Name: {student.first_name + ' ' + student.last_name if student else 'N/A'}")
    y -= 30
    c.drawString(50, y, f"Fee Type: {fee.fee_type}")
    c.drawString(350, y, f"Amount: Rs. {fee.amount}")
    y -= 30
    c.drawString(50, y, f"Paid Amount: Rs. {fee.paid_amount}")
    c.drawString(350, y, f"Payment Method: {fee.payment_method or 'N/A'}")
    y -= 30
    c.drawString(50, y, f"Transaction ID: {fee.transaction_id or 'N/A'}")
    y -= 30
    c.drawString(50, y, f"Status: {fee.status.value if hasattr(fee.status, 'value') else fee.status}")
    
    c.setFont("Helvetica", 8)
    c.drawString(50, 50, "This is a computer-generated receipt")
    
    c.save()
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=receipt_{fee_id}.pdf"})
