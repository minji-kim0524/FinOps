import io

import pandas as pd
from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.calculator import calculate_net_pay
from app.database import Base, engine, get_db
from app.models import SalaryRecord

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


def _save_calculated(df: pd.DataFrame, db: Session) -> list[SalaryRecord]:
    result_df = calculate_net_pay(df)

    records = [
        SalaryRecord(
            employee_name=str(row.get("employee_name", "")),
            gross_pay=int(row["gross_pay"]),
            num_dependents=int(row["num_dependents"]),
            national_pension=int(row["national_pension"]),
            health_insurance=int(row["health_insurance"]),
            long_term_care=int(row["long_term_care"]),
            employment_insurance=int(row["employment_insurance"]),
            income_tax=int(row["income_tax"]),
            local_income_tax=int(row["local_income_tax"]),
            total_deduction=int(row["total_deduction"]),
            net_pay=int(row["net_pay"]),
        )
        for row in result_df.to_dict("records")
    ]
    db.add_all(records)
    db.commit()

    return records


@app.post("/calculate")
def calculate(input: SalaryInput, db: Session = Depends(get_db)):
    df = pd.DataFrame([input.model_dump()])
    record = _save_calculated(df, db)[0]
    return _serialize(record)


@app.post("/calculate/bulk")
async def calculate_bulk(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    if "num_dependents" not in df.columns:
        df["num_dependents"] = 1
    if "employee_name" not in df.columns:
        df["employee_name"] = ""

    records = _save_calculated(df, db)
    return [_serialize(record) for record in records]


@app.get("/records")
def list_records(db: Session = Depends(get_db)):
    records = db.query(SalaryRecord).order_by(SalaryRecord.id).all()
    return [_serialize(record) for record in records]
