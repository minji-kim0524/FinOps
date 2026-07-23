import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel

from app.calculator import calculate_net_pay

app = FastAPI(title="FinOps")


class SalaryInput(BaseModel):
    gross_pay: int


@app.post("/calculate")
def calculate(input: SalaryInput):
    df = pd.DataFrame([{"gross_pay": input.gross_pay}])
    result = calculate_net_pay(df)
    return result.iloc[0].to_dict()
