import pandas as pd

from app.calculator import calculate_net_pay


def test_calculate_net_pay_single_row():
    df = pd.DataFrame([{"gross_pay": 3_000_000}])

    result = calculate_net_pay(df)
    row = result.iloc[0]

    assert row["national_pension"] == 135_000
    assert row["health_insurance"] == 106_350
    assert row["long_term_care"] == 13_772
    assert row["employment_insurance"] == 27_000
    assert row["total_deduction"] == 282_122
    assert row["net_pay"] == 2_717_878


def test_calculate_net_pay_multiple_rows():
    df = pd.DataFrame([{"gross_pay": 2_000_000}, {"gross_pay": 5_000_000}])

    result = calculate_net_pay(df)

    assert list(result["net_pay"]) == [
        2_000_000 - result.iloc[0]["total_deduction"],
        5_000_000 - result.iloc[1]["total_deduction"],
    ]
    assert (result["net_pay"] < result["gross_pay"]).all()
