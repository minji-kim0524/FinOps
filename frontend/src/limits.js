// 백엔드(backend/app/limits.py)와 반드시 같은 값으로 맞춘다. 서버가 최종 검증을 하지만,
// 같은 한도를 입력 단계에서 먼저 보여줘야 사용자가 제출 후에야 거절당하지 않는다.
export const MAX_PAY_AMOUNT = 1_000_000_000;
export const MAX_DEPENDENTS = 50;
export const MAX_CHILDREN_8_TO_20 = 50;
export const EMPLOYEE_NAME_MAX_LENGTH = 50;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[A-Za-z0-9가-힣_.-]+$/;

// bcrypt는 입력의 앞 72바이트만 쓰므로, 글자 수가 아니라 UTF-8 바이트 수로 센다(한글은 글자당 3바이트).
export const BCRYPT_MAX_BYTES = 72;

export function utf8ByteLength(text) {
  return new TextEncoder().encode(text).length;
}
