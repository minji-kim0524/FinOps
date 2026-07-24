import pandas as pd
from fastapi import Depends, FastAPI
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.calculator import calculate_net_pay
from app.database import Base, engine, get_db
from app.models import SalaryRecord

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinOps")


class SalaryInput(BaseModel):
    gross_pay: int


@app.post("/calculate")
def calculate(input: SalaryInput, db: Session = Depends(get_db)):
    df = pd.DataFrame([{"gross_pay": input.gross_pay}])
    result = {k: int(v) for k, v in calculate_net_pay(df).iloc[0].to_dict().items()}

    record = SalaryRecord(**result)
    db.add(record)
    db.commit()
    db.refresh(record)

    return {**result, "id": record.id}


@app.get("/records")
def list_records(db: Session = Depends(get_db)):
    records = db.query(SalaryRecord).order_by(SalaryRecord.id).all()
    return [
        {
            "id": r.id,
            "gross_pay": r.gross_pay,
            "national_pension": r.national_pension,
            "health_insurance": r.health_insurance,
            "long_term_care": r.long_term_care,
            "employment_insurance": r.employment_insurance,
            "total_deduction": r.total_deduction,
            "net_pay": r.net_pay,
        }
        for r in records
    ]
