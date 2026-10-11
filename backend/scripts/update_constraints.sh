#!/usr/bin/env bash
# constraints.txt(의존성 잠금 파일)를 다시 만든다. 이 스크립트가 만드는 파일을 직접 고치지 마세요.
#
# 운영 이미지(Dockerfile)와 같은 Linux 환경에서, 지금 시점에 해석되는 최신 버전을 Python 버전별로 구해 합친다.
#   - 3.11: 운영(Docker/Render)·CI가 쓰는 버전. 보안 수정판이 3.10 이상에서만 나오는 패키지가 많아 이쪽이 기준이다.
#   - 3.9 : 로컬 macOS 기본 Python 호환용. 3.11과 버전이 다른 패키지는 python_version 조건을 붙여 구분한다.
# macOS에서 직접 freeze하지 않는 이유: SQLAlchemy가 Linux에서만 설치하는 greenlet 같은 하위 의존성이 빠진다.
#
# 사용법: backend/ 에서 `scripts/update_constraints.sh` (Docker 필요). 끝난 뒤 pytest와 pip-audit을 돌려 확인한다.
set -euo pipefail
cd "$(dirname "$0")/.."

PYTHON_VERSIONS=(3.11 3.9)
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for version in "${PYTHON_VERSIONS[@]}"; do
  echo "Python $version 환경에서 의존성을 해석하는 중..." >&2
  docker run --rm -v "$PWD:/src:ro" "python:${version}-slim" bash -c '
    set -euo pipefail
    mkdir /work && cd /work
    # constraints.txt를 가리키는 -c 줄을 뺀 사본으로 설치해야 "지금 해석되는 최신 버전"이 나온다.
    grep -v "^-c " /src/requirements.txt > requirements.txt
    sed "s#^-r requirements.txt#-r /work/requirements.txt#" /src/requirements-dev.txt > requirements-dev.txt
    python -m venv /v
    /v/bin/pip install -q --upgrade pip >/dev/null 2>&1
    /v/bin/pip install -q -r requirements-dev.txt >&2
    /v/bin/pip freeze
  ' | grep -viE "^(pip|setuptools|wheel)==" | sort -f > "$work/py${version}.txt"
done

python3 - "$work" > constraints.txt <<'PY'
import sys
from pathlib import Path

work = Path(sys.argv[1])


def load(version):
    pins = {}
    for line in (work / f"py{version}.txt").read_text().splitlines():
        name, pinned = line.strip().split("==", 1)
        pins[name] = pinned
    return pins


modern, legacy = load("3.11"), load("3.9")

print("# 의존성 \"잠금\" 파일: 직접 쓰는 패키지와 그 하위 의존성까지 모두 정확한 버전으로 고정한다.")
print("# 없으면 빌드할 때마다 최신 버전이 설치되어, 상류 라이브러리 릴리스 하나로 배포가 깨지거나")
print("# 로컬/CI/운영이 서로 다른 버전으로 실행될 수 있다(예: bcrypt 5는 72바이트 초과 입력을 예외로 거부).")
print("#")
print("# 직접 수정하지 말고 `scripts/update_constraints.sh`로 다시 생성하세요(README \"의존성 업데이트\" 참고).")
print("# requirements.txt가 `-c constraints.txt`로 항상 적용하므로 설치 명령은 그대로입니다.")
print("# 3.10 이상(운영 3.11)과 3.9(로컬 호환)에서 버전이 다른 패키지는 python_version 조건으로 나눠 적었다.")
print("# 3.9용 줄은 로컬 Python을 3.10 이상으로 올리면 더 이상 필요 없다.")
for name in sorted(set(modern) | set(legacy), key=str.lower):
    new, old = modern.get(name), legacy.get(name)
    if new == old:
        print(f"{name}=={new}")
        continue
    # 한쪽 Python에서만 쓰는 패키지도 조건을 붙인다. 안 그러면 다른 Python에서 이 파일을 통째로 읽는
    # 도구(pip-audit 등)가 그 Python에 없는 버전을 찾다가 실패한다.
    if new is not None:
        print(f'{name}=={new}; python_version >= "3.10"')
    if old is not None:
        print(f'{name}=={old}; python_version < "3.10"')
PY

echo "constraints.txt를 갱신했습니다. git diff로 변경된 버전을 확인하고 테스트를 돌려 보세요." >&2
