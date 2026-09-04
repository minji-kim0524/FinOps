"""급여 이력(SalaryRecord)에 대한 순수 계산/조회 로직.

라우터(app/routers/records.py)에서 HTTP 처리와 분리해, DB 세션과 pandas
DataFrame을 오가는 변환 로직만 모아둔다.
"""

import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.calculator import calculate_net_pay
from app.models import SalaryRecord

EXPORT_COLUMN_LABELS = {
    "employee_name": "직원명",
    "gross_pay": "세전 급여",
    "num_dependents": "부양가족 수",
    "num_children_8_to_20": "8~20세 자녀 수",
    "national_pension": "국민연금",
    "health_insurance": "건강보험",
    "long_term_care": "장기요양보험",
    "employment_insurance": "고용보험",
    "income_tax": "소득세",
    "local_income_tax": "지방소득세",
    "total_deduction": "공제액 합계",
    "net_pay": "실수령액",
}


def serialize_record(record: SalaryRecord) -> dict:
    return {
        "id": record.id,
        "created_at": record.created_at.isoformat(),
        "employee_name": record.employee_name,
        "gross_pay": record.gross_pay,
        "num_dependents": record.num_dependents,
        "num_children_8_to_20": record.num_children_8_to_20,
        "national_pension": record.national_pension,
        "health_insurance": record.health_insurance,
        "long_term_care": record.long_term_care,
        "employment_insurance": record.employment_insurance,
        "income_tax": record.income_tax,
        "local_income_tax": record.local_income_tax,
        "total_deduction": record.total_deduction,
        "net_pay": record.net_pay,
    }


def apply_calculated_fields(record: SalaryRecord, row: dict) -> None:
    record.employee_name = str(row.get("employee_name", ""))
    record.gross_pay = int(row["gross_pay"])
    record.num_dependents = int(row["num_dependents"])
    record.num_children_8_to_20 = int(row.get("num_children_8_to_20", 0))
    record.national_pension = int(row["national_pension"])
    record.health_insurance = int(row["health_insurance"])
    record.long_term_care = int(row["long_term_care"])
    record.employment_insurance = int(row["employment_insurance"])
    record.income_tax = int(row["income_tax"])
    record.local_income_tax = int(row["local_income_tax"])
    record.total_deduction = int(row["total_deduction"])
    record.net_pay = int(row["net_pay"])


def save_calculated_records(df: pd.DataFrame, db: Session, owner_id: int) -> list[SalaryRecord]:
    result_df = calculate_net_pay(df)

    records = []
    for row in result_df.to_dict("records"):
        record = SalaryRecord(owner_id=owner_id)
        apply_calculated_fields(record, row)
        records.append(record)

    db.add_all(records)
    db.commit()

    return records


def get_owned_record_or_404(record_id: int, owner_id: int, db: Session) -> SalaryRecord:
    record = (
        db.query(SalaryRecord)
        .filter(SalaryRecord.id == record_id, SalaryRecord.owner_id == owner_id)
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


def build_group_summary(records: list[SalaryRecord], group_key: str, group_value) -> list[dict]:
    """records를 group_value(record) 기준으로 묶어 건수/합계/평균을 집계한다."""
    if not records:
        return []

    df = pd.DataFrame(
        [
            {
                group_key: group_value(record),
                "gross_pay": record.gross_pay,
                "total_deduction": record.total_deduction,
                "net_pay": record.net_pay,
            }
            for record in records
        ]
    )

    summary = (
        df.groupby(group_key)
        .agg(
            count=("net_pay", "size"),
            total_gross_pay=("gross_pay", "sum"),
            total_deduction=("total_deduction", "sum"),
            total_net_pay=("net_pay", "sum"),
            avg_net_pay=("net_pay", "mean"),
        )
        .reset_index()
        .sort_values(group_key)
    )
    summary["avg_net_pay"] = summary["avg_net_pay"].round().astype(int)

    return summary.to_dict("records")
