import re

from pydantic import BaseModel, Field, field_validator

from app.limits import (
    BCRYPT_MAX_BYTES,
    CONTROL_CHARS_RE,
    CREDENTIAL_INPUT_MAX_LENGTH,
    EMPLOYEE_NAME_MAX_LENGTH,
    MAX_CHILDREN_8_TO_20,
    MAX_DEPENDENTS,
    MAX_PAY_AMOUNT,
    SECURITY_QUESTION_MAX_LENGTH,
    USERNAME_MAX_LENGTH,
    USERNAME_MIN_LENGTH,
    USERNAME_PATTERN,
)

PASSWORD_MIN_LENGTH = 8


def validate_password_strength(password: str) -> str:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"비밀번호는 최소 {PASSWORD_MIN_LENGTH}자 이상이어야 합니다")
    if len(password.encode("utf-8")) > BCRYPT_MAX_BYTES:
        raise ValueError(f"비밀번호가 너무 깁니다(영문·숫자 기준 최대 {BCRYPT_MAX_BYTES}자, 한글은 24자)")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("비밀번호에 영문자를 포함해야 합니다")
    if not re.search(r"\d", password):
        raise ValueError("비밀번호에 숫자를 포함해야 합니다")
    return password


def validate_security_answer_length(answer: str) -> str:
    # 보안 답변도 bcrypt로 해시하므로(정규화 후 기준) 비밀번호와 같은 72바이트 한도가 있다.
    if len(answer.strip().lower().encode("utf-8")) > BCRYPT_MAX_BYTES:
        raise ValueError("보안 답변이 너무 깁니다(영문 기준 최대 72자, 한글은 24자)")
    return answer


def validate_username_format(username: str) -> str:
    if not USERNAME_MIN_LENGTH <= len(username) <= USERNAME_MAX_LENGTH:
        raise ValueError(f"아이디는 {USERNAME_MIN_LENGTH}~{USERNAME_MAX_LENGTH}자여야 합니다")
    if not USERNAME_PATTERN.match(username):
        raise ValueError("아이디에는 영문, 숫자, 한글, 밑줄(_), 마침표(.), 하이픈(-)만 사용할 수 있습니다")
    return username


class SalaryInput(BaseModel):
    gross_pay: int = Field(ge=0, le=MAX_PAY_AMOUNT)
    bonus_pay: int = Field(0, ge=0, le=MAX_PAY_AMOUNT)
    num_dependents: int = Field(1, ge=1, le=MAX_DEPENDENTS)
    num_children_8_to_20: int = Field(0, ge=0, le=MAX_CHILDREN_8_TO_20)
    employee_name: str = Field("", max_length=EMPLOYEE_NAME_MAX_LENGTH)

    @field_validator("employee_name")
    @classmethod
    def _check_employee_name(cls, value: str) -> str:
        value = value.strip()
        if CONTROL_CHARS_RE.search(value):
            raise ValueError("직원명에는 줄바꿈이나 제어문자를 사용할 수 없습니다")
        return value


class AuthInput(BaseModel):
    """로그인 전용. 이미 저장된 비밀번호를 그대로 검증해야 하므로 강도 검사를 하지 않는다."""

    username: str = Field(max_length=CREDENTIAL_INPUT_MAX_LENGTH)
    password: str = Field(max_length=CREDENTIAL_INPUT_MAX_LENGTH)


class RegisterInput(BaseModel):
    username: str
    password: str
    security_question: str = Field(max_length=SECURITY_QUESTION_MAX_LENGTH)
    security_answer: str

    @field_validator("username")
    @classmethod
    def _check_username(cls, value: str) -> str:
        return validate_username_format(value)

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

    @field_validator("security_answer")
    @classmethod
    def _check_answer_length(cls, value: str) -> str:
        return validate_security_answer_length(value)


class ChangePasswordInput(BaseModel):
    current_password: str = Field(max_length=CREDENTIAL_INPUT_MAX_LENGTH)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class SecurityQuestionInput(BaseModel):
    username: str = Field(max_length=CREDENTIAL_INPUT_MAX_LENGTH)


class SecurityQuestionOutput(BaseModel):
    security_question: str


class PasswordResetInput(BaseModel):
    username: str = Field(max_length=CREDENTIAL_INPUT_MAX_LENGTH)
    security_answer: str = Field(max_length=CREDENTIAL_INPUT_MAX_LENGTH)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class TokenOutput(BaseModel):
    access_token: str
    token_type: str = "bearer"
