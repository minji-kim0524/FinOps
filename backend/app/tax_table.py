from pathlib import Path

import pandas as pd

# 국세청 근로소득 간이세액표(2026.03.01. 시행) 기준 실제 데이터.
# 원본: 근로소득 간이세액표_2026.03.01.xlsx (사용자 제공)
# 구조: 월급여액(770,000원 미만은 표에 없어 0으로 간주) 구간별 x 공제대상가족 수(1~11명) 세액.
# 마지막 행(gross_pay_min=10,000,000, gross_pay_max 비어있음)은 "월급여 1천만원" 지점의 세액으로,
# 1천만원 초과 구간의 계산식(_OVER_TOP_TIERS)에서 기준값으로 쓰인다.
TABLE_PATH = Path(__file__).parent / "data" / "income_tax_table.csv"
MAX_TABLE_DEPENDENTS = 11

_TABLE = pd.read_csv(TABLE_PATH).sort_values("gross_pay_min").reset_index(drop=True)
_TOP_BRACKET = _TABLE.iloc[-1]
_TOP_GROSS_PAY = int(_TOP_BRACKET["gross_pay_min"])

# 소득세법 시행령 별표2, 4호: 월급여 1천만원 초과 시 적용되는 구간별 계산식.
# (구간 하한, 구간 상한(None=상한 없음), 기준세액에 더할 고정액, 초과금액 배율, 초과금액에 98%를 곱할지 여부)
_OVER_TOP_TIERS = [
    (10_000_000, 14_000_000, 25_000, 0.35, True),
    (14_000_000, 28_000_000, 1_397_000, 0.38, True),
    (28_000_000, 30_000_000, 6_610_600, 0.40, True),
    (30_000_000, 45_000_000, 7_394_600, 0.40, False),
    (45_000_000, 87_000_000, 13_394_600, 0.42, False),
    (87_000_000, None, 31_034_600, 0.45, False),
]

# 소득세법 시행령 별표2, 3호: 8세 이상 20세 이하 자녀 수에 따른 추가 세액공제.
_CHILD_CREDIT_BASE = {0: 0, 1: 20_830, 2: 45_830}
_CHILD_CREDIT_PER_EXTRA = 33_330


def _dependents_value(row: pd.Series, dependents: int) -> float:
    """별표2 4호: 부양가족 수가 11명을 초과하면 10명·11명 세액의 차이만큼 계속 차감한다."""
    dependents = max(int(dependents), 1)
    capped = min(dependents, MAX_TABLE_DEPENDENTS)
    value = row[f"dep_{capped}"]
    if dependents > MAX_TABLE_DEPENDENTS:
        dep_10, dep_11 = row["dep_10"], row["dep_11"]
        value = dep_11 - (dep_10 - dep_11) * (dependents - MAX_TABLE_DEPENDENTS)
    return max(value, 0)


def _lookup_over_top(gross_pay: int, dependents: int) -> float:
    base = _dependents_value(_TOP_BRACKET, dependents)
    if gross_pay <= _TOP_GROSS_PAY:
        return base

    for lower, upper, addend, rate, apply_98pct in _OVER_TOP_TIERS:
        if upper is None or gross_pay <= upper:
            excess = gross_pay - lower
            if apply_98pct:
                excess *= 0.98
            return base + addend + excess * rate

    return base  # 도달하지 않음 (마지막 구간은 상한이 없음)


def _lookup_single(gross_pay: int, dependents: int) -> int:
    if gross_pay > _TOP_GROSS_PAY:
        value = _lookup_over_top(gross_pay, dependents)
    else:
        bracket = _TABLE[_TABLE["gross_pay_min"] <= gross_pay].iloc[-1]
        value = _dependents_value(bracket, dependents)
    return int(round(value))


def lookup_income_tax(df: pd.DataFrame) -> pd.Series:
    """gross_pay, num_dependents 컬럼을 가진 df를 받아 간이세액표 기준 소득세를 조회한다."""
    return df.apply(
        lambda row: _lookup_single(int(row["gross_pay"]), int(row["num_dependents"])),
        axis=1,
    )


def child_tax_credit(num_children_8_to_20: int) -> int:
    """별표2 3호: 8~20세 자녀 수에 따라 간이세액표 세액에서 추가로 공제할 금액."""
    n = max(int(num_children_8_to_20), 0)
    if n <= 2:
        return _CHILD_CREDIT_BASE[n]
    return _CHILD_CREDIT_BASE[2] + (n - 2) * _CHILD_CREDIT_PER_EXTRA
