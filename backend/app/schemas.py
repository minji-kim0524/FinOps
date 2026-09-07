import re

from pydantic import BaseModel, field_validator

PASSWORD_MIN_LENGTH = 8


def validate_password_strength(password: str) -> str:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"비밀번호는 최소 {PASSWORD_MIN_LENGTH}자 이상이어야 합니다")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("비밀번호에 영문자를 포함해야 합니다")
    if not re.search(r"\d", password):
        raise ValueError("비밀번호에 숫자를 포함해야 합니다")
    return password


class SalaryInput(BaseModel):
    gross_pay: int
    bonus_pay: int = 0
    num_dependents: int = 1
    num_children_8_to_20: int = 0
    employee_name: str = ""


class AuthInput(BaseModel):
    """로그인 전용. 이미 저장된 비밀번호를 그대로 검증해야 하므로 강도 검사를 하지 않는다."""

    username: str
    password: str


class RegisterInput(BaseModel):
    username: str
    password: str
    security_question: str
    security_answer: str

    @field_validator("password")
    @classmethod
    def _check_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("security_question", "security_answer")
    @classmethod
    def _check_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("보안 질문과 답변을 모두 입력하세요")
        return value


class ChangePasswordInput(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class SecurityQuestionInput(BaseModel):
    username: str


class SecurityQuestionOutput(BaseModel):
    security_question: str


class PasswordResetInput(BaseModel):
    username: str
    security_answer: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class TokenOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"
