import io
import os

import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.calculator import calculate_net_pay
from app.database import Base, engine, get_db
from app.models import SalaryRecord, User

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinOps")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


class SalaryInput(BaseModel):
    gross_pay: int
    num_dependents: int = 1
    employee_name: str = ""


class AuthInput(BaseModel):
    username: str
    password: str


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str


class TokenOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"


EXPORT_COLUMN_LABELS = {
    "employee_name": "직원명",
    "gross_pay": "세전 급여",
    "num_dependents": "부양가족 수",
    "national_pension": "국민연금",
    "health_insurance": "건강보험",
    "long_term_care": "장기요양보험",
    "employment_insurance": "고용보험",
    "income_tax": "소득세",
    "local_income_tax": "지방소득세",
    "total_deduction": "공제액 합계",
    "net_pay": "실수령액",
}


def _serialize(record: SalaryRecord) -> dict:
    return {
        "id": record.id,
        "employee_name": record.employee_name,
        "gross_pay": record.gross_pay,
        "num_dependents": record.num_dependents,
        "national_pension": record.national_pension,
        "health_insurance": record.health_insurance,
        "long_term_care": record.long_term_care,
        "employment_insurance": record.employment_insurance,
        "income_tax": record.income_tax,
        "local_income_tax": record.local_income_tax,
        "total_deduction": record.total_deduction,
        "net_pay": record.net_pay,
    }


def _apply_calculated_fields(record: SalaryRecord, row: dict) -> None:
    record.employee_name = str(row.get("employee_name", ""))
    record.gross_pay = int(row["gross_pay"])
    record.num_dependents = int(row["num_dependents"])
    record.national_pension = int(row["national_pension"])
    record.health_insurance = int(row["health_insurance"])
    record.long_term_care = int(row["long_term_care"])
    record.employment_insurance = int(row["employment_insurance"])
    record.income_tax = int(row["income_tax"])
    record.local_income_tax = int(row["local_income_tax"])
    record.total_deduction = int(row["total_deduction"])
    record.net_pay = int(row["net_pay"])


def _save_calculated(df: pd.DataFrame, db: Session, owner_id: int) -> list[SalaryRecord]:
    result_df = calculate_net_pay(df)

    records = []
    for row in result_df.to_dict("records"):
        record = SalaryRecord(owner_id=owner_id)
        _apply_calculated_fields(record, row)
        records.append(record)

    db.add_all(records)
    db.commit()

    return records


def _get_record_or_404(record_id: int, owner_id: int, db: Session) -> SalaryRecord:
    record = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.id == record_id, SalaryRecord.owner_id == owner_id)
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@app.post("/auth/register", response_model=TokenOutput)
def register(input: AuthInput, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == input.username).first() is not None:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(username=input.username, hashed_password=hash_password(input.password))
    db.add(user)
    db.commit()

    return TokenOutput(access_token=create_access_token(user.username))


@app.post("/auth/login", response_model=TokenOutput)
def login(input: AuthInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == input.username).first()
    if user is None or not verify_password(input.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return TokenOutput(access_token=create_access_token(user.username))


@app.put("/auth/password")
def change_password(
    input: ChangePasswordInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(input.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(input.new_password)
    db.commit()

    return {"status": "ok"}


@app.post("/calculate")
def calculate(
    input: SalaryInput, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    df = pd.DataFrame([input.model_dump()])
    record = _save_calculated(df, db, current_user.id)[0]
    return _serialize(record)


@app.post("/calculate/bulk")
async def calculate_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    if "num_dependents" not in df.columns:
        df["num_dependents"] = 1
    if "employee_name" not in df.columns:
        df["employee_name"] = ""

    records = _save_calculated(df, db, current_user.id)
    return [_serialize(record) for record in records]


@app.get("/records")
def list_records(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.owner_id == current_user.id)
        .order_by(SalaryRecord.id)
        .all()
    )
    return [_serialize(record) for record in records]


@app.get("/records/export")
def export_records(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.owner_id == current_user.id)
        .order_by(SalaryRecord.id)
        .all()
    )

    rows = [_serialize(record) for record in records]
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


@app.get("/records/summary")
def monthly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.owner_id == current_user.id)
        .order_by(SalaryRecord.created_at)
        .all()
    )

    if not records:
        return []

    df = pd.DataFrame(
        [
            {
                "month": record.created_at.strftime("%Y-%m"),
                "gross_pay": record.gross_pay,
                "total_deduction": record.total_deduction,
                "net_pay": record.net_pay,
            }
            for record in records
        ]
    )

    summary = (
        df.groupby("month")
        .agg(
            count=("net_pay", "size"),
            total_gross_pay=("gross_pay", "sum"),
            total_deduction=("total_deduction", "sum"),
            total_net_pay=("net_pay", "sum"),
            avg_net_pay=("net_pay", "mean"),
        )
        .reset_index()
        .sort_values("month")
    )
    summary["avg_net_pay"] = summary["avg_net_pay"].round().astype(int)

    return summary.to_dict("records")


@app.put("/records/{record_id}")
def update_record(
    record_id: int,
    input: SalaryInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = _get_record_or_404(record_id, current_user.id, db)

    df = pd.DataFrame([input.model_dump()])
    row = calculate_net_pay(df).iloc[0].to_dict()
    _apply_calculated_fields(record, row)

    db.commit()
    db.refresh(record)
    return _serialize(record)


@app.delete("/records/{record_id}")
def delete_record(
    record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    record = _get_record_or_404(record_id, current_user.id, db)

    db.delete(record)
    db.commit()
    return {"id": record_id}
