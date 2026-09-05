#!/usr/bin/env bash
# backup_db.sh가 만든 gzip 백업 파일을 PostgreSQL DB에 복원한다.
# 대상 DB의 기존 데이터를 덮어쓸 수 있는 파괴적인 작업이므로 실행 전 확인을 받는다.
#
# 사용법:
#   DATABASE_URL=postgresql://user:pass@host:5432/dbname ./scripts/restore_db.sh backups/finops_backup_20260905_120000.sql.gz
set -euo pipefail

backup_file="${1:-}"
if [ -z "$backup_file" ]; then
  echo "에러: 복원할 백업 파일 경로를 인자로 넘겨주세요." >&2
  echo "예) DATABASE_URL=postgresql://user:pass@host:5432/dbname $0 backups/finops_backup_20260905_120000.sql.gz" >&2
  exit 1
fi

if [ ! -f "$backup_file" ]; then
  echo "에러: 파일을 찾을 수 없습니다: $backup_file" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "에러: DATABASE_URL 환경 변수가 필요합니다." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "에러: psql 명령을 찾을 수 없습니다. PostgreSQL 클라이언트 도구를 설치해주세요." >&2
  exit 1
fi

echo "경고: 대상 DB($DATABASE_URL)의 기존 데이터를 덮어씁니다."
read -r -p "계속하시겠습니까? (yes 입력 시 진행): " confirm
if [ "$confirm" != "yes" ]; then
  echo "취소되었습니다."
  exit 0
fi

echo "복원 중: $backup_file"
gunzip -c "$backup_file" | psql "$DATABASE_URL"
echo "복원 완료"
