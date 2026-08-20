from slowapi import Limiter
from slowapi.util import get_remote_address

# 요청자 IP 기준으로 카운트한다. 단일 프로세스로 배포되는 이 프로젝트 규모에서는
# 별도 저장소(Redis 등) 없이 메모리 기반 저장소로 충분하다.
limiter = Limiter(key_func=get_remote_address)
