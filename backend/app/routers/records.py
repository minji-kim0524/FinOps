import io
import zipfile
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
    RecordFilterParams,
    apply_calculated_fields,
    apply_record_filters,
    apply_record_sort,
    get_owned_record_or_404,
    parse_bulk_upload_csv,
    save_calculated_records,
    serialize_record,
    summarize_by_employee,
    summarize_by_month,
    summarize_by_year,
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

    valid_df, errors = parse_bulk_upload_csv(df)
    records = save_calculated_records(valid_df, db, current_user.id) if not valid_df.empty else []

    return {
        "created": [serialize_record(record) for record in records],
        "errors": errors,
    }


@router.get("/records/csv-template")
def download_csv_template():
    # 로그인 없이도 CSV 형식을 미리 확인할 수 있도록 인증을 요구하지 않는 정적 콘텐츠로 둔다.
    # Excel(특히 한글 Windows)에서 한글이 깨지지 않도록 UTF-8 BOM을 포함해 인코딩한다.
    csv_content = (
        "employee_name,gross_pay,bonus_pay,num_dependents,num_children_8_to_20\n"
        "홍길동,3000000,0,1,0\n"
        "김철수,3500000,500000,2,1\n"
    )

    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=salary_upload_template.csv"},
    )


@router.get("/records")
def list_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    filters: RecordFilterParams = Depends(RecordFilterParams),
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SalaryRecord).filter(SalaryRecord.owner_id == current_user.id)
    query = apply_record_filters(query, filters)

    total = query.count()
    records = (
        apply_record_sort(query, sort_by, sort_order)
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
def export_records(
    filters: RecordFilterParams = Depends(RecordFilterParams),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SalaryRecord).filter(SalaryRecord.owner_id == current_user.id)
    query = apply_record_filters(query, filters)
    records = query.order_by(SalaryRecord.id).all()

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


@router.get("/records/payslips")
def download_payslips_zip(
    filters: RecordFilterParams = Depends(RecordFilterParams),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """현재(또는 전체) 이력의 급여명세서 PDF를 한 번에 ZIP으로 묶어 내려받는다.

    /records, /records/export와 동일한 필터를 지원해, 화면에서 좁혀둔 범위만
    ZIP에 포함시킬 수 있다.
    """
    query = db.query(SalaryRecord).filter(SalaryRecord.owner_id == current_user.id)
    query = apply_record_filters(query, filters)
    records = query.order_by(SalaryRecord.id).all()

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for record in records:
            zip_file.writestr(f"payslip_{record.id}.pdf", build_payslip_pdf(record))
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=salary_payslips.zip"},
    )


@router.get("/records/summary")
def monthly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return summarize_by_month(db, current_user.id)


@router.get("/records/summary/yearly")
def yearly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return summarize_by_year(db, current_user.id)


@router.get("/records/summary/by-employee")
def employee_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return summarize_by_employee(db, current_user.id)


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
