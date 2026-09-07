import pandas as pd

from app.tax_table import child_tax_credit, lookup_income_tax

# MVP 단계: 4대보험을 실제 요율에 근사한 고정 비율(%)로 단순화.
# 실무 정확도(건강보험 상하한선, 연도별 요율 변경 등)는 추후 확장 대상.
# (소득세는 5단계에서 예시 데이터였다가, 이후 국세청 근로소득 간이세액표 실제 데이터로 교체됨 - tax_table.py 참고)
RATES = {
    "national_pension": 0.045,      # 국민연금
    "health_insurance": 0.03545,    # 건강보험
    "long_term_care": 0.1295,       # 장기요양보험 (건강보험료 기준)
    "employment_insurance": 0.009,  # 고용보험
}

# 국민연금 기준소득월액 상・하한액(2025.7.1.~2026.6.30. 적용, 보건복지부 고시).
# 월급여가 이 범위를 벗어나면 실제 기준소득월액은 상/하한액으로 고정되어 보험료가 계산된다.
NATIONAL_PENSION_INCOME_FLOOR = 400_000
NATIONAL_PENSION_INCOME_CAP = 6_370_000

# 건강보험료 상・하한액(2026.1.1. 시행, 보건복지부고시 제2025-222호).
# 국민연금과 달리 소득 기준이 아니라 계산된 보험료 자체의 상/하한이다.
# 고시된 금액은 근로자+회사 합산액이라, 절반(근로자 부담분)으로 나눈 값을 사용한다.
HEALTH_INSURANCE_PREMIUM_FLOOR = 10_080
HEALTH_INSURANCE_PREMIUM_CAP = 4_591_740

# 지방소득세는 항상 소득세의 10%
LOCAL_INCOME_TAX_RATE = 0.1


def calculate_net_pay(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "num_children_8_to_20" not in df.columns:
        df["num_children_8_to_20"] = 0
    if "bonus_pay" not in df.columns:
        df["bonus_pay"] = 0

    # 상여금/성과급은 정기 급여와 같은 달에 합산 지급되는 경우로 가정해, 4대보험료와
    # 소득세(간이세액표 조회) 모두 세전 급여 + 상여금을 기준으로 계산한다.
    total_pay = df["gross_pay"] + df["bonus_pay"]

    pension_base = total_pay.clip(lower=NATIONAL_PENSION_INCOME_FLOOR, upper=NATIONAL_PENSION_INCOME_CAP)
    df["national_pension"] = (pension_base * RATES["national_pension"]).round().astype(int)

    health_premium = (total_pay * RATES["health_insurance"]).round().astype(int)
    df["health_insurance"] = health_premium.clip(
        lower=HEALTH_INSURANCE_PREMIUM_FLOOR, upper=HEALTH_INSURANCE_PREMIUM_CAP
    )
    df["long_term_care"] = (df["health_insurance"] * RATES["long_term_care"]).round().astype(int)
    df["employment_insurance"] = (total_pay * RATES["employment_insurance"]).round().astype(int)

    table_income_tax = lookup_income_tax(df.assign(gross_pay=total_pay))
    child_credit = df["num_children_8_to_20"].apply(child_tax_credit)
    df["income_tax"] = (table_income_tax - child_credit).clip(lower=0).astype(int)
    df["local_income_tax"] = (df["income_tax"] * LOCAL_INCOME_TAX_RATE).round().astype(int)

    df["total_deduction"] = (
        df["national_pension"]
        + df["health_insurance"]
        + df["long_term_care"]
        + df["employment_insurance"]
        + df["income_tax"]
        + df["local_income_tax"]
    )
    df["net_pay"] = total_pay - df["total_deduction"]

    return df
