"""급여 이력(SalaryRecord)에 대한 순수 계산/조회 로직.

라우터(app/routers/records.py)에서 HTTP 처리와 분리해, DB 세션과 pandas
DataFrame을 오가는 변환 로직만 모아둔다.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Query as SAQuery
from sqlalchemy.orm import Session

from app.calculator import calculate_net_pay
from app.models import SalaryRecord

EXPORT_COLUMN_LABELS = {
    "employee_name": "직원명",
    "gross_pay": "세전 급여",
    "bonus_pay": "상여금/성과급",
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


@dataclass
class RecordFilterParams:
    """이력 목록(/records)·엑셀 내보내기(/records/export)·명세서 ZIP(/records/payslips)이
    공유하는 검색/필터 조건. 라우터에서 FastAPI 의존성(Depends)으로 그대로 쿼리 파라미터에 매핑된다."""

    search: str = ""
    employee_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    min_gross_pay: Optional[int] = None
    max_gross_pay: Optional[int] = None


def apply_record_filters(query: SAQuery, filters: RecordFilterParams) -> SAQuery:
    """RecordFilterParams 조건을 쿼리에 반영한다."""
    if filters.search:
        query = query.filter(SalaryRecord.employee_name.ilike(f"%{filters.search}%"))
    if filters.employee_name:
        query = query.filter(SalaryRecord.employee_name == filters.employee_name)
    if filters.start_date:
        query = query.filter(SalaryRecord.created_at >= datetime.fromisoformat(filters.start_date))
    if filters.end_date:
        query = query.filter(SalaryRecord.created_at <= datetime.fromisoformat(filters.end_date))
    if filters.min_gross_pay is not None:
        query = query.filter(SalaryRecord.gross_pay >= filters.min_gross_pay)
    if filters.max_gross_pay is not None:
        query = query.filter(SalaryRecord.gross_pay <= filters.max_gross_pay)
    return query


# 이력 표(프론트엔드)에서 정렬을 허용하는 컬럼. SalaryRecord의 실제 컬럼명과 1:1로 대응하며,
# 임의 문자열로 getattr(SalaryRecord, ...)을 호출하지 않도록 화이트리스트로만 검사한다.
SORTABLE_RECORD_FIELDS = frozenset(
    {
        "created_at",
        "employee_name",
        "gross_pay",
        "bonus_pay",
        "num_dependents",
        "num_children_8_to_20",
        "national_pension",
        "health_insurance",
        "long_term_care",
        "employment_insurance",
        "income_tax",
        "local_income_tax",
        "total_deduction",
        "net_pay",
    }
)


def apply_record_sort(query: SAQuery, sort_by: Optional[str], sort_order: str) -> SAQuery:
    """이력 목록(/records)의 정렬 조건. sort_by가 없거나 허용되지 않은 컬럼이면 기본(id) 정렬을 쓴다."""
    if sort_by not in SORTABLE_RECORD_FIELDS:
        return query.order_by(SalaryRecord.id)

    column = getattr(SalaryRecord, sort_by)
    column = column.desc() if sort_order == "desc" else column.asc()
    # 값이 같은 행이 여러 개일 때도 페이지마다 순서가 흔들리지 않도록 id를 보조 정렬 기준으로 둔다.
    return query.order_by(column, SalaryRecord.id)


def serialize_record(record: SalaryRecord) -> dict:
    return {
        "id": record.id,
        "created_at": record.created_at.isoformat(),
        "employee_name": record.employee_name,
        "gross_pay": record.gross_pay,
        "bonus_pay": record.bonus_pay,
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
    record.bonus_pay = int(row.get("bonus_pay", 0))
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


def parse_bulk_upload_csv(df: pd.DataFrame) -> tuple[pd.DataFrame, list[dict]]:
    """CSV 일괄 업로드(/calculate/bulk)용 DataFrame을 검증/보정한다.

    gross_pay는 필수 컬럼이라 없으면 400으로 바로 실패한다. employee_name/bonus_pay/
    num_dependents/num_children_8_to_20은 선택 컬럼이라 없으면 기본값으로 채운다.
    각 행의 gross_pay가 비어있거나 숫자가 아니거나 음수면 저장하지 않고 오류로 보고한다.
    반환값은 (저장 가능한 행만 남은 DataFrame, 행별 오류 목록).
    """
    if "gross_pay" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV에 gross_pay 컬럼이 없습니다.")

    df = df.copy()
    if "employee_name" not in df.columns:
        df["employee_name"] = ""
    if "bonus_pay" not in df.columns:
        df["bonus_pay"] = 0
    if "num_dependents" not in df.columns:
        df["num_dependents"] = 1
    if "num_children_8_to_20" not in df.columns:
        df["num_children_8_to_20"] = 0

    # bonus_pay/num_dependents/num_children_8_to_20은 선택 항목이라, 비어있거나 숫자가
    # 아니면 기본값으로 보정한다.
    df["gross_pay"] = pd.to_numeric(df["gross_pay"], errors="coerce")
    df["bonus_pay"] = pd.to_numeric(df["bonus_pay"], errors="coerce").fillna(0).clip(lower=0)
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
    valid_df["bonus_pay"] = valid_df["bonus_pay"].astype(int)
    valid_df["num_dependents"] = valid_df["num_dependents"].astype(int)
    valid_df["num_children_8_to_20"] = valid_df["num_children_8_to_20"].astype(int)

    return valid_df, errors


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


def get_owned_records_by_created_at(db: Session, owner_id: int) -> list[SalaryRecord]:
    """월별/연도별/직원별 집계(/records/summary*)가 공유하는 조회: 소유자의 전체 이력을 계산일시 순으로."""
    return (
        db.query(SalaryRecord)
        .filter(SalaryRecord.owner_id == owner_id)
        .order_by(SalaryRecord.created_at)
        .all()
    )


def build_group_summary(records: list[SalaryRecord], group_key: str, group_value) -> list[dict]:
    """records를 group_value(record) 기준으로 묶어 건수/합계/평균을 집계한다."""
    if not records:
        return []

    df = pd.DataFrame(
        [
            {
                group_key: group_value(record),
                # 집계상 "세전 급여"는 상여금/성과급을 포함한 실제 세전 총 지급액을 의미한다.
                "gross_pay": record.gross_pay + record.bonus_pay,
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
