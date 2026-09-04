from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    hash_security_answer,
    verify_password,
    verify_security_answer,
)
from app.database import get_db
from app.models import User
from app.rate_limit import limiter
from app.schemas import (
    AuthInput,
    ChangePasswordInput,
    PasswordResetInput,
    RegisterInput,
    SecurityQuestionInput,
    SecurityQuestionOutput,
    TokenOutput,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOutput)
@limiter.limit("5/minute")
def register(request: Request, input: RegisterInput, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == input.username).first() is not None:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=input.username,
        hashed_password=hash_password(input.password),
        security_question=input.security_question.strip(),
        security_answer_hash=hash_security_answer(input.security_answer),
    )
    db.add(user)
    db.commit()

    return TokenOutput(access_token=create_access_token(user.username))


@router.post("/login", response_model=TokenOutput)
@limiter.limit("5/minute")
def login(request: Request, input: AuthInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == input.username).first()
    if user is None or not verify_password(input.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return TokenOutput(access_token=create_access_token(user.username))


@router.post("/security-question", response_model=SecurityQuestionOutput)
@limiter.limit("5/minute")
def get_security_question(request: Request, input: SecurityQuestionInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == input.username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return SecurityQuestionOutput(security_question=user.security_question)


@router.post("/password-reset")
@limiter.limit("5/minute")
def reset_password(request: Request, input: PasswordResetInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == input.username).first()
    if user is None or not verify_security_answer(input.security_answer, user.security_answer_hash):
        raise HTTPException(status_code=400, detail="아이디 또는 보안 답변이 올바르지 않습니다")

    user.hashed_password = hash_password(input.new_password)
    db.commit()

    return {"status": "ok"}


@router.put("/password")
def change_password(
    input: ChangePasswordInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(input.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = hash_password(input.new_password)
    db.commit()

    return {"status": "ok"}
