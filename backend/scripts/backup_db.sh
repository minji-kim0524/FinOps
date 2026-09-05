#!/usr/bin/env bash
# PostgreSQL DB를 pg_dump로 백업해 backend/backups/ 아래 gzip 압축 파일로 저장한다.
# Render에 배포된 DB를 백업하려면 Render 대시보드 > finops-db > "External Connection String"을
# DATABASE_URL로 넘겨야 한다 (백엔드 서비스가 쓰는 내부 연결 문자열은 Render 네트워크 밖에서 접근 불가).
#
# 사용법:
#   DATABASE_URL=postgresql://user:pass@host:5432/dbname ./scripts/backup_db.sh
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "에러: DATABASE_URL 환경 변수가 필요합니다." >&2
  echo "예) DATABASE_URL=postgresql://user:pass@host:5432/dbname $0" >&2
  exit 1
fi

if [[ "$DATABASE_URL" == sqlite* ]]; then
  echo "에러: 이 스크립트는 PostgreSQL 전용입니다. 로컬 SQLite(finops.db)는 파일 자체를 복사하면 됩니다." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "에러: pg_dump 명령을 찾을 수 없습니다. PostgreSQL 클라이언트 도구를 설치해주세요." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backup_dir="$script_dir/../backups"
mkdir -p "$backup_dir"

timestamp="$(date +%Y%m%d_%H%M%S)"
backup_file="$backup_dir/finops_backup_${timestamp}.sql.gz"

echo "백업 중: $backup_file"
pg_dump "$DATABASE_URL" | gzip > "$backup_file"
echo "완료: $backup_file ($(du -h "$backup_file" | cut -f1))"
