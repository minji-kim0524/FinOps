import pandas as pd

from app.calculator import calculate_net_pay


def test_calculate_net_pay_single_row():
    df = pd.DataFrame([{"gross_pay": 3_000_000, "num_dependents": 1}])

    result = calculate_net_pay(df)
    row = result.iloc[0]

    assert row["national_pension"] == 135_000
    assert row["health_insurance"] == 106_350
    assert row["long_term_care"] == 13_772
    assert row["employment_insurance"] == 27_000
    assert row["income_tax"] == 74_350
    assert row["local_income_tax"] == 7_435
    assert row["total_deduction"] == 363_907
    assert row["net_pay"] == 2_636_093


def test_calculate_net_pay_child_credit_reduces_income_tax():
    df = pd.DataFrame(
        [
            {"gross_pay": 3_000_000, "num_dependents": 1, "num_children_8_to_20": 0},
            {"gross_pay": 3_000_000, "num_dependents": 1, "num_children_8_to_20": 1},
        ]
    )

    result = calculate_net_pay(df)

    assert result.iloc[0]["income_tax"] == 74_350
    assert result.iloc[1]["income_tax"] == 74_350 - 20_830
    assert result.iloc[1]["net_pay"] > result.iloc[0]["net_pay"]


def test_calculate_net_pay_child_credit_does_not_go_below_zero():
    # 소득세보다 자녀 세액공제가 더 큰 극단적인 경우에도 세액은 0원 밑으로 내려가지 않는다.
    df = pd.DataFrame([{"gross_pay": 1_060_000, "num_dependents": 1, "num_children_8_to_20": 5}])

    result = calculate_net_pay(df)

    assert result.iloc[0]["income_tax"] == 0
    assert result.iloc[0]["local_income_tax"] == 0


def test_calculate_net_pay_more_dependents_reduces_income_tax():
    df = pd.DataFrame(
        [
            {"gross_pay": 3_000_000, "num_dependents": 1},
            {"gross_pay": 3_000_000, "num_dependents": 3},
        ]
    )

    result = calculate_net_pay(df)

    assert result.iloc[0]["income_tax"] > result.iloc[1]["income_tax"]
    assert result.iloc[0]["net_pay"] < result.iloc[1]["net_pay"]


def test_calculate_net_pay_national_pension_applies_upper_cap():
    # 월급여가 기준소득월액 상한액(6,370,000원)을 넘으면, 상한액을 기준으로 국민연금을 계산한다.
    df = pd.DataFrame([{"gross_pay": 10_000_000, "num_dependents": 1}])

    result = calculate_net_pay(df)

    assert result.iloc[0]["national_pension"] == round(6_370_000 * 0.045)


def test_calculate_net_pay_national_pension_applies_lower_floor():
    # 월급여가 기준소득월액 하한액(400,000원)보다 낮으면, 하한액을 기준으로 국민연금을 계산한다.
    df = pd.DataFrame([{"gross_pay": 300_000, "num_dependents": 1}])

    result = calculate_net_pay(df)

    assert result.iloc[0]["national_pension"] == round(400_000 * 0.045)


def test_calculate_net_pay_national_pension_within_range_uses_gross_pay():
    # 상/하한액 사이의 급여는 그대로 국민연금 계산 기준(기준소득월액)이 된다.
    df = pd.DataFrame([{"gross_pay": 1_000_000, "num_dependents": 1}])

    result = calculate_net_pay(df)

    assert result.iloc[0]["national_pension"] == round(1_000_000 * 0.045)


def test_calculate_net_pay_health_insurance_applies_upper_cap():
    # 건강보험료 자체의 상한액(근로자 부담분 4,591,740원)을 넘으면 상한액으로 고정된다.
    df = pd.DataFrame([{"gross_pay": 150_000_000, "num_dependents": 1}])

    result = calculate_net_pay(df)

    assert result.iloc[0]["health_insurance"] == 4_591_740


def test_calculate_net_pay_health_insurance_applies_lower_floor():
    # 건강보험료 자체의 하한액(근로자 부담분 10,080원)보다 낮으면 하한액으로 고정된다.
    df = pd.DataFrame([{"gross_pay": 200_000, "num_dependents": 1}])

    result = calculate_net_pay(df)

    assert result.iloc[0]["health_insurance"] == 10_080


def test_calculate_net_pay_bonus_pay_is_added_to_regular_pay_for_deductions():
    # 상여금은 세전 급여와 합산된 금액을 기준으로 4대보험료·소득세가 계산된다는 점을,
    # "세전 급여 4,000,000원 단독" 케이스와 동일한 결과가 나오는지로 검증한다.
    with_bonus = calculate_net_pay(
        pd.DataFrame([{"gross_pay": 3_000_000, "bonus_pay": 1_000_000, "num_dependents": 1}])
    ).iloc[0]
    combined_only = calculate_net_pay(
        pd.DataFrame([{"gross_pay": 4_000_000, "num_dependents": 1}])
    ).iloc[0]

    for column in [
        "national_pension",
        "health_insurance",
        "long_term_care",
        "employment_insurance",
        "income_tax",
        "local_income_tax",
        "total_deduction",
    ]:
        assert with_bonus[column] == combined_only[column]

    # gross_pay 컬럼 자체는 상여금과 분리되어 원래 값(3,000,000원)을 그대로 유지한다.
    assert with_bonus["gross_pay"] == 3_000_000
    # 실수령액은 세전 급여+상여금 합계에서 공제액을 뺀 값이다.
    assert with_bonus["net_pay"] == 3_000_000 + 1_000_000 - with_bonus["total_deduction"]


def test_calculate_net_pay_without_bonus_pay_column_defaults_to_zero():
    with_column = calculate_net_pay(
        pd.DataFrame([{"gross_pay": 3_000_000, "bonus_pay": 0, "num_dependents": 1}])
    ).iloc[0]
    without_column = calculate_net_pay(pd.DataFrame([{"gross_pay": 3_000_000, "num_dependents": 1}])).iloc[0]

    assert with_column["net_pay"] == without_column["net_pay"]


def test_calculate_net_pay_multiple_rows():
    df = pd.DataFrame(
        [
            {"gross_pay": 2_000_000, "num_dependents": 1},
            {"gross_pay": 5_000_000, "num_dependents": 2},
        ]
    )

    result = calculate_net_pay(df)

    assert list(result["net_pay"]) == [
        2_000_000 - result.iloc[0]["total_deduction"],
        5_000_000 - result.iloc[1]["total_deduction"],
    ]
    assert (result["net_pay"] < result["gross_pay"]).all()
