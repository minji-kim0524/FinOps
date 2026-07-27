from pathlib import Path

import pandas as pd

# 학습용 예시 참조표입니다. 실제 국세청 간이세액표 수치가 아니며,
# "과세표준 구간 x 부양가족 수 -> 세액" 조회 구조(merge_asof)를 보여주기 위한 샘플입니다.
# 실제 서비스에 쓰려면 국세청이 배포하는 정식 간이세액표로 이 CSV를 교체해야 합니다.
TABLE_PATH = Path(__file__).parent / "data" / "income_tax_table.csv"
MAX_TABLE_DEPENDENTS = 4


def _load_table() -> pd.DataFrame:
    table = pd.read_csv(TABLE_PATH)
    return table.sort_values("gross_pay_min").reset_index(drop=True)


_TABLE = _load_table()


def lookup_income_tax(df: pd.DataFrame) -> pd.Series:
    """gross_pay, num_dependents 컬럼을 가진 df를 받아 소득세를 조회한다."""
    lookup_df = df[["gross_pay", "num_dependents"]].copy()
    lookup_df["dependents"] = lookup_df["num_dependents"].clip(1, MAX_TABLE_DEPENDENTS)
    lookup_df["_original_index"] = lookup_df.index
    lookup_df = lookup_df.sort_values("gross_pay")

    merged = pd.merge_asof(
        lookup_df,
        _TABLE,
        left_on="gross_pay",
        right_on="gross_pay_min",
        by="dependents",
        direction="backward",
    )
    merged = merged.set_index("_original_index").sort_index()
    return merged["income_tax"].fillna(0).astype(int)
