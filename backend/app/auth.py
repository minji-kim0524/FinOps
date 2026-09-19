import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

# 개발용 기본값입니다. 실제 배포 시에는 반드시 별도의 안전한 값으로 교체해야 합니다.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# 계정 잠금: IP 기준 요청 속도만 제한하는 slowapi(분당 5회)와 달리, 여러 IP에 걸쳐
# 천천히 시도하는 무차별 대입도 막기 위해 "계정(username)" 기준으로 연속 실패 횟수를 센다.
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

_security = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed_password.encode())


def _normalize_security_answer(answer: str) -> str:
    return answer.strip().lower()


def hash_security_answer(answer: str) -> str:
    return bcrypt.hashpw(_normalize_security_answer(answer).encode(), bcrypt.gensalt()).decode()


def verify_security_answer(answer: str, hashed_answer: str) -> bool:
    return bcrypt.checkpw(_normalize_security_answer(answer).encode(), hashed_answer.encode())


def is_account_locked(user: User) -> bool:
    return user.locked_until is not None and user.locked_until > datetime.utcnow()


def register_failed_login(user: User, db: Session) -> None:
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
        user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
    db.commit()


def reset_login_attempts(user: User, db: Session) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user
