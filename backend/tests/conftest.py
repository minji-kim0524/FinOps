import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.rate_limit import limiter

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

TEST_USERNAME = "tester"
TEST_PASSWORD = "testpass123"


@pytest.fixture()
def client():
    # 로그인/회원가입에 걸린 rate limit이 테스트 간에 누적되지 않도록 매 테스트마다 초기화한다.
    limiter.reset()
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    test_client = TestClient(app)
    test_client.post("/auth/register", json={"username": TEST_USERNAME, "password": TEST_PASSWORD})
    token = test_client.post(
        "/auth/login", json={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    ).json()["access_token"]
    test_client.headers.update({"Authorization": f"Bearer {token}"})

    yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
