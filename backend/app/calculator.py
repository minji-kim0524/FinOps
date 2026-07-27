import pandas as pd

from app.tax_table import lookup_income_tax

# MVP 단계: 4대보험을 실제 요율에 근사한 고정 비율(%)로 단순화.
# 실무 정확도(건강보험 상하한선, 연도별 요율 변경 등)는 추후 확장 대상.
RATES = {
    "national_pension": 0.045,      # 국민연금
    "health_insurance": 0.03545,    # 건강보험
    "long_term_care": 0.1295,       # 장기요양보험 (건강보험료 기준)
    "employment_insurance": 0.009,  # 고용보험
}

# 지방소득세는 항상 소득세의 10%
LOCAL_INCOME_TAX_RATE = 0.1


def calculate_net_pay(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["national_pension"] = (df["gross_pay"] * RATES["national_pension"]).round().astype(int)
    df["health_insurance"] = (df["gross_pay"] * RATES["health_insurance"]).round().astype(int)
    df["long_term_care"] = (df["health_insurance"] * RATES["long_term_care"]).round().astype(int)
    df["employment_insurance"] = (df["gross_pay"] * RATES["employment_insurance"]).round().astype(int)

    df["income_tax"] = lookup_income_tax(df)
    df["local_income_tax"] = (df["income_tax"] * LOCAL_INCOME_TAX_RATE).round().astype(int)

    df["total_deduction"] = (
        df["national_pension"]
        + df["health_insurance"]
        + df["long_term_care"]
        + df["employment_insurance"]
        + df["income_tax"]
        + df["local_income_tax"]
    )
    df["net_pay"] = df["gross_pay"] - df["total_deduction"]

    return df
