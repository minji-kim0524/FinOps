FROM python:3.11-slim AS builder

WORKDIR /app

# 의존성 설치는 별도 스테이지에서 가상환경(/opt/venv)에 진행한다. 이 스테이지 자체는
# 최종 이미지에 포함되지 않으므로, pip이 설치 과정에서 남기는 부산물이 배포 이미지 크기에
# 영향을 주지 않는다.
COPY requirements.txt .
# venv 생성 시 자동으로 함께 설치되는 pip/setuptools(ensurepip)는 컨테이너 실행 중에는
# 쓰이지 않으므로, 의존성 설치 후 지워 최종 이미지에 남지 않게 한다.
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt \
    && rm -rf /opt/venv/lib/python*/site-packages/pip \
        /opt/venv/lib/python*/site-packages/pip-*.dist-info \
        /opt/venv/lib/python*/site-packages/setuptools \
        /opt/venv/lib/python*/site-packages/setuptools-*.dist-info \
        /opt/venv/lib/python*/site-packages/wheel* \
        /opt/venv/bin/pip*


FROM python:3.11-slim

WORKDIR /app

# 급여명세서 PDF에 한글을 렌더링하려면 한글 글리프를 포함한 폰트가 필요하다.
RUN apt-get update && apt-get install -y --no-install-recommends fonts-nanum \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY app ./app
COPY alembic.ini .
COPY migrations ./migrations

EXPOSE 8000

CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
