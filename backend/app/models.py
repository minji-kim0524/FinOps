from sqlalchemy import Column, Integer, String

from app.database import Base


class SalaryRecord(Base):
    __tablename__ = "salary_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_name = Column(String, nullable=False, default="")
    gross_pay = Column(Integer, nullable=False)
    num_dependents = Column(Integer, nullable=False)
    national_pension = Column(Integer, nullable=False)
    health_insurance = Column(Integer, nullable=False)
    long_term_care = Column(Integer, nullable=False)
    employment_insurance = Column(Integer, nullable=False)
    income_tax = Column(Integer, nullable=False)
    local_income_tax = Column(Integer, nullable=False)
    total_deduction = Column(Integer, nullable=False)
    net_pay = Column(Integer, nullable=False)
