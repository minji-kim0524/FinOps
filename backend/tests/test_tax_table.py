import pandas as pd

from app.tax_table import child_tax_credit, lookup_income_tax

# 아래 기대값은 모두 국세청 근로소득 간이세액표_2026.03.01.xlsx 원본 셀 값과
# 별표2(부표) 계산식을 직접 대조해서 확인한 값이다.


def _lookup(gross_pay: int, dependents: int) -> int:
    df = pd.DataFrame([{"gross_pay": gross_pay, "num_dependents": dependents}])
    return int(lookup_income_tax(df).iloc[0])


def test_below_minimum_bracket_is_zero():
    assert _lookup(500_000, 1) == 0


def test_first_nonzero_bracket():
    # 표의 (1,060,000 ~ 1,065,000) 구간, 부양가족 1명: 1,040원
    assert _lookup(1_060_000, 1) == 1_040


def test_matches_table_row_for_multiple_dependents():
    # 표의 (1,770,000 ~ 1,780,000) 구간: 1명 14,500 / 2명 10,000 / 3명 2,030
    assert _lookup(1_775_000, 1) == 14_500
    assert _lookup(1_775_000, 2) == 10_000
    assert _lookup(1_775_000, 3) == 2_030


def test_bracket_just_below_10_million():
    # 표의 마지막 구간 (9,980,000 ~ 10,000,000), 부양가족 1명: 1,503,990원
    assert _lookup(9_999_999, 1) == 1_503_990


def test_exactly_10_million_uses_top_bracket_base():
    # 1천만원 지점의 원본 세액(1명: 1,507,400원). 초과 계산식이 아닌 표의 기준값 그대로.
    assert _lookup(10_000_000, 1) == 1_507_400


def test_over_10_million_first_tier_formula():
    # (10,000천원인 경우의 세액) + (초과금액x98%x35%) + 25,000원
    # 초과금액 1원 x 0.98 x 0.35 = 0.343 -> 반올림 0
    assert _lookup(10_000_001, 1) == 1_507_400 + 25_000


def test_over_10_million_second_tier_formula():
    # (10,000천원 세액) + 1,397,000원 + (14,000천원 초과금액x98%x38%)
    # 초과금액 1,000,000 x 0.98 x 0.38 = 372,400
    assert _lookup(15_000_000, 1) == 1_507_400 + 1_397_000 + 372_400


def test_over_45_million_tier_has_no_98_percent_factor():
    # (10,000천원 세액) + 13,394,600원 + (45,000천원 초과금액 x 42%, 98% 미적용)
    assert _lookup(50_000_000, 1) == 1_507_400 + 13_394_600 + 5_000_000 * 0.42


def test_dependents_over_11_extrapolates_linearly():
    # 별표2 4호: 11명 초과 시 (10명 세액 - 11명 세액) x 초과 인원만큼 계속 차감
    dep10 = _lookup(3_000_000, 10)
    dep11 = _lookup(3_000_000, 11)
    assert _lookup(3_000_000, 12) == max(dep11 - (dep10 - dep11), 0)


def test_dependents_over_11_never_negative():
    assert _lookup(3_000_000, 20) == 0


def test_child_tax_credit_amounts():
    assert child_tax_credit(0) == 0
    assert child_tax_credit(1) == 20_830
    assert child_tax_credit(2) == 45_830
    assert child_tax_credit(3) == 45_830 + 33_330
    assert child_tax_credit(4) == 45_830 + 33_330 * 2
