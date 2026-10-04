import logging
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.limits import BCRYPT_MAX_BYTES
from app.models import User

load_dotenv()

logger = logging.getLogger(__name__)

# 소스에 공개된 개발용 기본값. 이 값으로 서명한 토큰은 누구나 위조할 수 있으므로 운영에서는 쓸 수 없다.
DEV_DEFAULT_SECRET_KEY = "dev-secret-key-change-in-production"
MIN_SECRET_KEY_LENGTH = 32
APP_ENVIRONMENTS = ("development", "production")


def load_secret_key() -> str:
    """JWT 서명 비밀키를 읽는다. 운영(APP_ENV=production)에서는 안전하지 않은 설정이면 시작을 거부한다.

    환경변수를 빠뜨린 채 배포하면 기본 키로 조용히 동작해 토큰 위조가 가능해지므로, 그런 배포는
    "동작은 하지만 위험한" 상태가 아니라 "시작되지 않는" 상태가 되도록 막는다. 로컬 개발은 설정
    없이 기본 키로 그대로 쓸 수 있다. APP_ENV 오타(예: "prod")로 이 검사가 조용히 꺼지지 않도록
    허용된 값 외에는 시작을 거부한다.
    """
    environment = os.getenv("APP_ENV", "development").strip().lower()
    if environment not in APP_ENVIRONMENTS:
        raise RuntimeError(
            f"APP_ENV는 {' 또는 '.join(APP_ENVIRONMENTS)} 중 하나여야 합니다(현재 값: {environment!r})."
        )

    # "JWT_SECRET_KEY="처럼 빈 값으로 남겨둔 경우도 설정하지 않은 것으로 본다.
    secret = os.getenv("JWT_SECRET_KEY") or None

    if environment == "production":
        if secret is None:
            raise RuntimeError("운영 환경(APP_ENV=production)에서는 JWT_SECRET_KEY를 반드시 설정해야 합니다.")
        if secret == DEV_DEFAULT_SECRET_KEY:
            raise RuntimeError("JWT_SECRET_KEY에 공개된 개발용 기본값을 쓸 수 없습니다. 무작위 값으로 바꾸세요.")
        if len(secret) < MIN_SECRET_KEY_LENGTH:
            raise RuntimeError(f"JWT_SECRET_KEY는 최소 {MIN_SECRET_KEY_LENGTH}자 이상이어야 합니다.")
        return secret

    if secret is None:
        logger.warning("JWT_SECRET_KEY가 없어 공개된 개발용 기본 키를 사용합니다. 운영에서는 사용하지 마세요.")
        return DEV_DEFAULT_SECRET_KEY
    return secret


SECRET_KEY = load_secret_key()
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
    password_bytes = password.encode()
    # bcrypt 5부터는 72바이트를 넘는 입력을 예외로 거부한다. 가입 때 같은 한도로 막으므로
    # 이보다 긴 입력은 맞을 수 없는 비밀번호이고, 500 오류가 아니라 "불일치"로 처리해야 한다.
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        return False
    return bcrypt.checkpw(password_bytes, hashed_password.encode())


def _normalize_security_answer(answer: str) -> str:
    return answer.strip().lower()


def hash_security_answer(answer: str) -> str:
    return bcrypt.hashpw(_normalize_security_answer(answer).encode(), bcrypt.gensalt()).decode()


def verify_security_answer(answer: str, hashed_answer: str) -> bool:
    answer_bytes = _normalize_security_answer(answer).encode()
    if len(answer_bytes) > BCRYPT_MAX_BYTES:
        return False
    return bcrypt.checkpw(answer_bytes, hashed_answer.encode())


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
