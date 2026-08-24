FROM python:3.11-slim

WORKDIR /app

# 급여명세서 PDF에 한글을 렌더링하려면 한글 글리프를 포함한 폰트가 필요하다.
RUN apt-get update && apt-get install -y --no-install-recommends fonts-nanum \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
