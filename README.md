# FinOps

세전 급여를 입력하면 국민연금·건강보험·장기요양보험·고용보험·소득세·지방소득세를 자동으로 계산해 실수령액을 보여주는 급여 계산기입니다. FastAPI + pandas 백엔드와 React 프론트엔드로 구성되어 있고, Render에 배포되어 있습니다.

**배포 주소**
- 프론트엔드: https://finops-frontend-46sh.onrender.com
- 백엔드 API: https://finops-backend-scd8.onrender.com

> Render 무료 플랜은 일정 시간 요청이 없으면 슬립 모드로 전환되어, 접속 후 첫 응답이 몇십 초 걸릴 수 있습니다.

## 주요 기능

- **급여 계산**: 세전 급여 + 부양가족 수 입력 → 4대보험·소득세·지방소득세 공제 후 실수령액 계산
- **CSV 일괄 업로드**: 여러 직원의 급여를 한 번에 업로드해 일괄 계산. 잘못된 행(값 누락·비숫자·음수)은 건너뛰고, 어느 행이 왜 실패했는지 별도로 안내
- **이력 관리**: 계산 이력 조회·검색·정렬·수정·삭제
- **엑셀 내보내기**: 계산 이력을 `.xlsx` 파일로 다운로드
- **월별 집계**: 계산 이력을 월 단위로 묶어 총 지급액·총 공제액·평균 실수령액 등을 집계
- **인증**: 회원가입/로그인(JWT), 비밀번호 변경. 계산 이력은 사용자별로 분리되어 본인 이력만 조회·수정·삭제 가능
- **다크모드**: 시스템 설정을 기본값으로 사용하고, 수동 전환도 가능 (선택은 저장되어 유지됨)

## 기술 스택

### Backend
- Python, FastAPI
- pandas (계산 로직, CSV 처리, 월별 집계, 엑셀 내보내기)
- SQLAlchemy + PostgreSQL(배포)/SQLite(로컬 기본값)
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
│   │   ├── tax_table.py    # 소득세 예시 참조표 조회 (merge_asof)
│   │   ├── auth.py         # JWT 발급/검증, 비밀번호 해싱
│   │   ├── models.py       # SQLAlchemy 모델 (User, SalaryRecord)
│   │   ├── database.py     # DB 연결 설정
│   │   └── data/           # 소득세 예시 참조표 CSV
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
uvicorn app.main:app --reload --port 8000
```
DB는 별도 설정이 없으면 SQLite(`finops.db`)를 사용합니다.

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

## 참고 사항

- **소득세 계산은 예시 데이터입니다.** 국세청 간이세액표 원본이 아니라, "과세표준 구간 × 부양가족 수 → 세액" 조회 구조를 보여주기 위한 학습용 샘플 참조표(`backend/app/data/income_tax_table.csv`)를 사용합니다. 실제 급여 업무에 쓰려면 정식 간이세액표로 교체가 필요합니다.
- 4대보험 요율도 실제 요율에 근사한 고정 비율로 단순화되어 있으며, 건강보험 상/하한선 등은 반영되어 있지 않습니다.
- `work-logs/` 디렉토리에 초기 셋팅부터 현재까지의 작업 기록이 날짜별로 정리되어 있습니다.
