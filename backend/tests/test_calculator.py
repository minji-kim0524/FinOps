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
