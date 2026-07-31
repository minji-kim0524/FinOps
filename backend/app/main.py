import io

import pandas as pd
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.calculator import calculate_net_pay
from app.database import Base, engine, get_db
from app.models import SalaryRecord, User

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinOps")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SalaryInput(BaseModel):
    gross_pay: int
    num_dependents: int = 1
    employee_name: str = ""


class AuthInput(BaseModel):
    username: str
    password: str


class TokenOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"


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
