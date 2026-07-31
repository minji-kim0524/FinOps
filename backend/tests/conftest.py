import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

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
