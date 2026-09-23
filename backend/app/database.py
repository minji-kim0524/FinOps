import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 로컬 개발 시 backend/.env(.env.example 참고)에 적어둔 환경변수를 읽어온다.
# 이미 설정된 환경변수(Docker/Render 등)는 덮어쓰지 않으므로 배포 환경에는 영향이 없다.
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finops.db")

# SQLite 전용 옵션. PostgreSQL 등 다른 DB로 연결할 때는 필요 없음.
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
