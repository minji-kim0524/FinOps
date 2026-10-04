import logging
import os
import subprocess
import sys
from pathlib import Path

import pytest

from app.auth import DEV_DEFAULT_SECRET_KEY, MIN_SECRET_KEY_LENGTH, load_secret_key

GOOD_SECRET = "x" * MIN_SECRET_KEY_LENGTH
BACKEND_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)


def test_development_without_config_uses_the_default_key_and_warns(caplog):
    with caplog.at_level(logging.WARNING, logger="app.auth"):
        assert load_secret_key() == DEV_DEFAULT_SECRET_KEY

    assert "개발용 기본 키" in caplog.text


def test_development_uses_the_configured_key_without_warning(monkeypatch, caplog):
    monkeypatch.setenv("JWT_SECRET_KEY", "my-local-secret")

    with caplog.at_level(logging.WARNING, logger="app.auth"):
        assert load_secret_key() == "my-local-secret"

    assert caplog.text == ""


def test_blank_secret_is_treated_as_unset(monkeypatch):
    # .env.example에서 "JWT_SECRET_KEY="처럼 비워둔 경우 빈 문자열을 비밀키로 쓰면 안 된다.
    monkeypatch.setenv("JWT_SECRET_KEY", "")

    assert load_secret_key() == DEV_DEFAULT_SECRET_KEY


def test_production_accepts_a_strong_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", GOOD_SECRET)

    assert load_secret_key() == GOOD_SECRET


def test_app_env_is_case_and_whitespace_insensitive(monkeypatch):
    monkeypatch.setenv("APP_ENV", " Production ")

    with pytest.raises(RuntimeError, match="반드시 설정"):
        load_secret_key()


def test_production_refuses_to_start_without_a_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")

    with pytest.raises(RuntimeError, match="반드시 설정"):
        load_secret_key()


def test_production_rejects_the_published_dev_default(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", DEV_DEFAULT_SECRET_KEY)

    with pytest.raises(RuntimeError, match="개발용 기본값"):
        load_secret_key()


def test_production_rejects_a_short_key(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "x" * (MIN_SECRET_KEY_LENGTH - 1))

    with pytest.raises(RuntimeError, match="최소"):
        load_secret_key()


def test_production_treats_a_blank_key_as_missing(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "")

    with pytest.raises(RuntimeError, match="반드시 설정"):
        load_secret_key()


@pytest.mark.parametrize("typo", ["prod", "staging", "", "1"])
def test_unknown_app_env_is_rejected_so_the_check_cannot_be_silently_skipped(monkeypatch, typo):
    monkeypatch.setenv("APP_ENV", typo)

    with pytest.raises(RuntimeError, match="APP_ENV"):
        load_secret_key()


def _import_app_in_fresh_process(**env):
    # 서버가 실제로 시작될 때(모듈 import 시점)도 거부되는지 확인하려고 새 프로세스에서 import 한다.
    # 로컬 backend/.env가 있어도 결과가 달라지지 않도록 모든 관련 값을 명시한다(.env는 기존 환경변수를 덮어쓰지 않는다).
    full_env = {**os.environ, "DATABASE_URL": "sqlite:///:memory:", **env}
    return subprocess.run(
        [sys.executable, "-c", "import app.main"],
        cwd=BACKEND_DIR,
        env=full_env,
        capture_output=True,
        text=True,
    )


def test_server_import_fails_in_production_without_a_key():
    result = _import_app_in_fresh_process(APP_ENV="production", JWT_SECRET_KEY="")

    assert result.returncode != 0
    assert "JWT_SECRET_KEY를 반드시 설정" in result.stderr


def test_server_import_succeeds_in_production_with_a_key():
    result = _import_app_in_fresh_process(APP_ENV="production", JWT_SECRET_KEY=GOOD_SECRET)

    assert result.returncode == 0, result.stderr


def test_server_import_succeeds_in_development_without_a_key():
    result = _import_app_in_fresh_process(APP_ENV="development", JWT_SECRET_KEY="")

    assert result.returncode == 0, result.stderr
