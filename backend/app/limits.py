"""사용자 입력 검증에 쓰는 한도 상수. 스키마(app/schemas.py)·CSV 업로드·조회 파라미터가 같은 값을 공유한다.

프론트엔드(frontend/src/limits.js)에도 같은 값이 있어야 입력 단계에서 먼저 막을 수 있다.
"""

import re

# 세전 급여·상여금 각각의 상한. 운영 DB(PostgreSQL)의 Integer(int4, 최대 약 21.4억) 컬럼에
# 합계(세전 급여 + 상여금)가 넘치지 않도록 두 값을 더해도 21.4억 아래가 되는 10억으로 잡았다.
MAX_PAY_AMOUNT = 1_000_000_000

MAX_DEPENDENTS = 50
MAX_CHILDREN_8_TO_20 = 50

EMPLOYEE_NAME_MAX_LENGTH = 50

# NUL(0x00) 같은 제어문자는 PostgreSQL 문자열 컬럼에 저장하면 오류가 나고, 줄바꿈 등은
# 표·PDF·엑셀에서 깨져 보이므로 직원명 같은 한 줄짜리 텍스트에서는 허용하지 않는다.
CONTROL_CHARS_RE = re.compile(r"[\x00-\x1f\x7f]")

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9가-힣_.\-]+$")

SECURITY_QUESTION_MAX_LENGTH = 100

# bcrypt는 입력의 앞 72바이트만 해시에 쓴다(bcrypt 5부터는 초과 입력을 예외로 거부).
# 한글은 UTF-8에서 글자당 3바이트라 글자 수가 아니라 바이트 수로 검사해야 한다.
BCRYPT_MAX_BYTES = 72

# 로그인·재설정 요청의 아이디/비밀번호/보안 답변은 형식 검사 대신 비정상적으로 긴 입력만 걸러낸다.
# (과거에 길이 제한 없이 가입한 계정도 로그인할 수 있어야 하므로 가입 규칙보다 느슨하게 둔다)
CREDENTIAL_INPUT_MAX_LENGTH = 128

# 목록 조회·필터 파라미터 상한
SEARCH_TEXT_MAX_LENGTH = 100
MAX_PAGE = 1_000_000
MAX_RECORD_ID = 2_147_483_647
