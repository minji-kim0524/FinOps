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
    assert row["income_tax"] == 95_000
    assert row["local_income_tax"] == 9_500
    assert row["total_deduction"] == 386_622
    assert row["net_pay"] == 2_613_378


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
