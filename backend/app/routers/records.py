import io
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.calculator import calculate_net_pay
from app.database import get_db
from app.models import SalaryRecord, User
from app.payslip import build_payslip_pdf
from app.schemas import SalaryInput
from app.services.records import (
    EXPORT_COLUMN_LABELS,
    apply_calculated_fields,
    build_group_summary,
    get_owned_record_or_404,
    save_calculated_records,
    serialize_record,
)

router = APIRouter(tags=["records"])


@router.post("/calculate")
def calculate(
    input: SalaryInput, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    df = pd.DataFrame([input.model_dump()])
    record = save_calculated_records(df, db, current_user.id)[0]
    return serialize_record(record)


@router.post("/calculate/bulk")
async def calculate_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="CSV 파일을 읽을 수 없습니다.")

    if "gross_pay" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV에 gross_pay 컬럼이 없습니다.")

    if "employee_name" not in df.columns:
        df["employee_name"] = ""
    if "num_dependents" not in df.columns:
        df["num_dependents"] = 1
    if "num_children_8_to_20" not in df.columns:
        df["num_children_8_to_20"] = 0

    # gross_pay는 필수: 비어있거나 숫자가 아니거나 음수인 행은 저장하지 않고 오류로 보고한다.
    # num_dependents/num_children_8_to_20은 선택 항목이라, 비어있거나 숫자가 아니면 기본값으로 보정한다.
    df["gross_pay"] = pd.to_numeric(df["gross_pay"], errors="coerce")
    df["num_dependents"] = pd.to_numeric(df["num_dependents"], errors="coerce").fillna(1).clip(lower=1)
    df["num_children_8_to_20"] = (
        pd.to_numeric(df["num_children_8_to_20"], errors="coerce").fillna(0).clip(lower=0)
    )

    valid_mask = df["gross_pay"].notna() & (df["gross_pay"] >= 0)
    errors = [
        {"row": int(idx) + 2, "reason": "세전 급여(gross_pay) 값이 없거나 올바른 숫자가 아닙니다"}
        for idx in df.index[~valid_mask]
    ]

    valid_df = df[valid_mask].copy()
    # to_numeric/clip을 거치며 float64가 된 컬럼을 정수로 되돌린다.
    # (income_tax_table과의 merge_asof는 dtype이 일치해야 하므로 float로 두면 실패한다)
    valid_df["gross_pay"] = valid_df["gross_pay"].astype(int)
    valid_df["num_dependents"] = valid_df["num_dependents"].astype(int)
    valid_df["num_children_8_to_20"] = valid_df["num_children_8_to_20"].astype(int)
    records = save_calculated_records(valid_df, db, current_user.id) if not valid_df.empty else []

    return {
        "created": [serialize_record(record) for record in records],
        "errors": errors,
    }


@router.get("/records")
def list_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = "",
    employee_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_gross_pay: Optional[int] = None,
    max_gross_pay: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SalaryRecord).filter(SalaryRecord.owner_id == current_user.id)

    if search:
        query = query.filter(SalaryRecord.employee_name.ilike(f"%{search}%"))
    if employee_name:
        query = query.filter(SalaryRecord.employee_name == employee_name)
    if start_date:
        query = query.filter(SalaryRecord.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(SalaryRecord.created_at <= datetime.fromisoformat(end_date))
    if min_gross_pay is not None:
        query = query.filter(SalaryRecord.gross_pay >= min_gross_pay)
    if max_gross_pay is not None:
        query = query.filter(SalaryRecord.gross_pay <= max_gross_pay)

    total = query.count()
    records = (
        query.order_by(SalaryRecord.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [serialize_record(record) for record in records],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/records/export")
def export_records(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.owner_id == current_user.id)
        .order_by(SalaryRecord.id)
        .all()
    )

    rows = [serialize_record(record) for record in records]
    columns = list(EXPORT_COLUMN_LABELS.keys())
    df = pd.DataFrame(rows, columns=["id"] + columns) if rows else pd.DataFrame(columns=["id"] + columns)
    df = df[columns].rename(columns=EXPORT_COLUMN_LABELS)

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="급여 이력")
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=salary_records.xlsx"},
    )


@router.get("/records/summary")
def monthly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.owner_id == current_user.id)
        .order_by(SalaryRecord.created_at)
        .all()
    )

    return build_group_summary(records, "month", lambda r: r.created_at.strftime("%Y-%m"))


@router.get("/records/summary/yearly")
def yearly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.owner_id == current_user.id)
        .order_by(SalaryRecord.created_at)
        .all()
    )

    return build_group_summary(records, "year", lambda r: r.created_at.strftime("%Y"))


@router.get("/records/summary/by-employee")
def employee_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.owner_id == current_user.id)
        .order_by(SalaryRecord.created_at)
        .all()
    )

    return build_group_summary(records, "employee_name", lambda r: r.employee_name or "(미지정)")


@router.get("/records/{record_id}/payslip")
def download_payslip(
    record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    record = get_owned_record_or_404(record_id, current_user.id, db)
    pdf_bytes = build_payslip_pdf(record)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=payslip_{record_id}.pdf"},
    )


@router.put("/records/{record_id}")
def update_record(
    record_id: int,
    input: SalaryInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_owned_record_or_404(record_id, current_user.id, db)

    df = pd.DataFrame([input.model_dump()])
    row = calculate_net_pay(df).iloc[0].to_dict()
    apply_calculated_fields(record, row)

    db.commit()
    db.refresh(record)
    return serialize_record(record)


@router.delete("/records/{record_id}")
def delete_record(
    record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    record = get_owned_record_or_404(record_id, current_user.id, db)

    db.delete(record)
    db.commit()
    return {"id": record_id}
