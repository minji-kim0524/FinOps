import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.rate_limit import limiter
from app.routers import auth, records

# DB 스키마는 alembic 마이그레이션으로 관리한다 (schema는 더 이상 create_all로 자동 생성하지 않음).
# 로컬/Docker/Render 모두 애플리케이션 시작 전 `alembic upgrade head`를 실행해야 한다.

app = FastAPI(title="FinOps")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "너무 많은 요청입니다. 잠시 후 다시 시도해주세요."},
    )


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(records.router)
