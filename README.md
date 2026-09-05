# FinOps

세전 급여를 입력하면 국민연금·건강보험·장기요양보험·고용보험·소득세·지방소득세를 자동으로 계산해 실수령액을 보여주는 급여 계산기입니다. FastAPI + pandas 백엔드와 React 프론트엔드로 구성되어 있고, Render에 배포되어 있습니다.

**배포 주소**
- 프론트엔드: https://finops-frontend-46sh.onrender.com
- 백엔드 API: https://finops-backend-scd8.onrender.com

> Render 무료 플랜은 일정 시간 요청이 없으면 슬립 모드로 전환되어, 접속 후 첫 응답이 몇십 초 걸릴 수 있습니다.

## 주요 기능

- **급여 계산**: 세전 급여 + 부양가족 수(+ 8~20세 자녀 수) 입력 → 4대보험·소득세·지방소득세 공제 후 실수령액 계산. 소득세는 국세청 근로소득 간이세액표(2026.03.01. 기준) 실제 데이터로 조회
- **CSV 일괄 업로드**: 여러 직원의 급여를 한 번에 업로드해 일괄 계산. 잘못된 행(값 누락·비숫자·음수)은 건너뛰고, 어느 행이 왜 실패했는지 별도로 안내
- **이력 관리**: 계산 이력 조회·검색·정렬·수정·삭제. 목록은 서버 사이드 페이지네이션(페이지당 10건)이며, 검색어·직원·계산일 범위·급여 범위 필터도 서버에서 처리해 이력이 많아져도 매번 전체 데이터를 내려받지 않음
- **엑셀 내보내기**: 계산 이력을 `.xlsx` 파일로 다운로드
- **급여명세서 PDF**: 계산 이력 각 건을 급여명세서 형태의 PDF로 다운로드
- **월별/연도별/직원별 집계**: 계산 이력을 월·연도·직원 단위로 묶어 총 지급액·총 공제액·평균 실수령액 등을 집계하고, 월별 추이를 꺾은선 그래프로 표시. 이력 표는 직원 선택 드롭다운으로도 필터링 가능
- **인증**: 회원가입/로그인(JWT), 비밀번호 변경. 로그인 상태를 잊었을 때는 가입 시 등록한 보안 질문/답변으로 본인 확인 후 비밀번호 재설정 가능. 계산 이력은 사용자별로 분리되어 본인 이력만 조회·수정·삭제 가능
- **다크모드**: 시스템 설정을 기본값으로 사용하고, 수동 전환도 가능 (선택은 저장되어 유지됨). 라이트/다크 모드 모두 입력창 placeholder 텍스트가 WCAG AA 명암비(4.5:1) 이상을 충족하도록 별도 조정
- **반응형 레이아웃**: 좁은 화면(480px 이하)에서는 급여 계산 폼과 CSV 업로드 버튼이 세로로 쌓이며 페이지 전체가 가로로 스크롤되지 않음. 이력 표처럼 원래 폭이 넓은 콘텐츠는 표 자체의 스크롤 영역 안에서만 가로로 스크롤됨

## 기술 스택

### Backend
- Python, FastAPI
- pandas (계산 로직, CSV 처리, 월별 집계, 엑셀 내보내기)
- SQLAlchemy + PostgreSQL(배포)/SQLite(로컬 기본값)
- Alembic (DB 스키마 마이그레이션)
- JWT(pyjwt) + bcrypt 기반 인증
- pytest (단위/통합 테스트)

### Frontend
- React (Vite)
- Ant Design (UI 컴포넌트), Recharts (차트)
- axios

### Infra
- Docker, docker-compose (백엔드+프론트엔드+PostgreSQL 로컬 통합 실행)
- Render (배포), GitHub Actions (CI)

## 프로젝트 구조

```
FinOps/
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI 라우트
│   │   ├── calculator.py   # pandas 기반 공제·실수령액 계산 로직
│   │   ├── tax_table.py    # 국세청 근로소득 간이세액표 조회 + 1천만원 초과 구간 계산식
│   │   ├── payslip.py      # 급여명세서 PDF 생성 (reportlab)
│   │   ├── auth.py         # JWT 발급/검증, 비밀번호 해싱
│   │   ├── models.py       # SQLAlchemy 모델 (User, SalaryRecord)
│   │   ├── database.py     # DB 연결 설정
│   │   └── data/           # 근로소득 간이세액표 원본 데이터 CSV
│   ├── migrations/          # Alembic 마이그레이션 스크립트
│   ├── scripts/              # DB 백업/복원 스크립트
│   ├── alembic.ini
│   ├── tests/               # pytest 테스트
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # 메인 화면 (입력 폼·이력 표·차트·집계)
│   │   ├── LoginPage.jsx    # 로그인/회원가입 화면
│   │   └── api.js           # axios 인스턴스 (토큰 자동 첨부)
│   └── Dockerfile
├── docker-compose.yml        # 로컬 통합 실행 (backend + frontend + postgres)
├── render.yaml                # Render 배포 Blueprint
├── .github/workflows/ci.yml   # GitHub Actions CI (pytest, 프론트 빌드)
└── work-logs/                 # 날짜별 작업 기록
```

## 시작하기

### 로컬 개발 (백엔드/프론트엔드 각각 실행)

**백엔드**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
DB는 별도 설정이 없으면 SQLite(`finops.db`)를 사용합니다. 테이블은 더 이상 앱 실행 시 자동 생성되지 않으므로, 최초 실행 전(그리고 이후 스키마가 바뀔 때마다) `alembic upgrade head`를 실행해야 합니다.

모델(`app/models.py`)을 수정했다면 새 마이그레이션을 생성해야 합니다.
```bash
alembic revision --autogenerate -m "설명"
```
생성된 `migrations/versions/*.py` 파일 내용을 검토한 뒤 커밋하세요.

급여명세서 PDF에 한글을 표시하려면 한글 지원 폰트가 필요합니다. Docker/Render 환경은 `fonts-nanum` 패키지가 자동 설치되어 있고, macOS는 기본 내장된 AppleGothic을 사용합니다. 그 외 환경에서 로컬로 백엔드를 직접 실행한다면 한글 폰트를 별도로 설치해야 합니다.

**프론트엔드**
```bash
cd frontend
npm install
npm run dev
```
`http://localhost:5173`에서 확인할 수 있습니다.

### Docker Compose로 한 번에 실행

```bash
docker compose up --build
```
백엔드(FastAPI), 프론트엔드(React), PostgreSQL 세 컨테이너가 함께 뜨고, DB 데이터는 named volume에 보존됩니다.

### 테스트

```bash
cd backend
python -m pytest -v
```
`main` 브랜치에 push/PR이 생기면 GitHub Actions가 pytest와 프론트엔드 빌드를 자동으로 검증합니다.

### DB 백업/복원

Render 무료 플랜 PostgreSQL은 일정 기간이 지나면 정지(suspend)·만료될 수 있어, 운영 DB는 별도로 백업해두는 것이 안전합니다. `backend/scripts/`에 pg_dump/psql 기반 백업·복원 스크립트가 있습니다.

```bash
cd backend
# 백업 (Render 대시보드 > finops-db > External Connection String 사용)
DATABASE_URL=postgresql://user:pass@host:5432/dbname ./scripts/backup_db.sh

# 복원 (기존 데이터를 덮어쓰므로 실행 시 확인 프롬프트가 뜬다)
DATABASE_URL=postgresql://user:pass@host:5432/dbname ./scripts/restore_db.sh backups/finops_backup_20260905_120000.sql.gz
```
백업 파일은 `backend/backups/`에 타임스탬프가 붙은 `.sql.gz`로 저장되며, 이 디렉터리는 git에 커밋되지 않습니다. 로컬 개발용 SQLite(`finops.db`)는 파일을 그대로 복사하면 되므로 이 스크립트 대상이 아닙니다.

## 참고 사항

- **소득세는 국세청이 배포한 근로소득 간이세액표(2026.03.01. 시행) 실제 데이터를 사용합니다.** 월급여 1천만원까지는 표를 그대로 조회하고, 초과분은 소득세법 시행령 별표2의 구간별 계산식을 적용합니다. 부양가족 11명 초과 시 보정 공식, 8~20세 자녀 세액공제(1명 20,830원 / 2명 45,830원 / 3명 이상 45,830원+초과 1명당 33,330원)도 반영되어 있습니다. 다만 학자금 관련 예외 등 일부 세부 규정은 반영되어 있지 않고, 세율표는 매년 개정되므로 최신 여부는 별도 확인이 필요합니다.
- 4대보험 요율은 실제 요율에 근사한 고정 비율로 단순화되어 있습니다. 국민연금은 기준소득월액 상한액(6,370,000원)·하한액(400,000원, 2025.7.1.~2026.6.30. 보건복지부 고시 기준)을 반영해 월급여가 이 범위를 벗어나면 상/하한액을 기준으로 계산합니다. 건강보험도 근로자 부담분 기준 보험료 상한액(4,591,740원)·하한액(10,080원, 2026.1.1. 시행 보건복지부고시 제2025-222호 기준)을 반영합니다 — 국민연금과 달리 소득이 아니라 계산된 보험료 자체에 상/하한을 적용합니다.
- DB 스키마는 Alembic으로 관리합니다. Docker(`CMD`)와 Render 배포, GitHub Actions E2E 테스트 모두 애플리케이션/테스트 실행 전 `alembic upgrade head`를 자동으로 실행하도록 되어 있습니다. (pytest는 매 테스트마다 새로 만드는 인메모리 SQLite에 `Base.metadata.create_all`을 그대로 사용하므로 마이그레이션과 무관합니다.)
- `work-logs/` 디렉토리에 초기 셋팅부터 현재까지의 작업 기록이 날짜별로 정리되어 있습니다.
