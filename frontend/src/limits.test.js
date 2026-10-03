import { describe, expect, it } from "vitest";
import { BCRYPT_MAX_BYTES, USERNAME_PATTERN, utf8ByteLength } from "./limits";

describe("utf8ByteLength", () => {
  it("영문·숫자는 글자당 1바이트, 한글은 3바이트로 센다", () => {
    expect(utf8ByteLength("abc123")).toBe(6);
    expect(utf8ByteLength("가나다")).toBe(9);
  });

  it("한글 24자는 bcrypt 한도(72바이트) 이내이고 25자는 넘는다", () => {
    expect(utf8ByteLength("가".repeat(24))).toBeLessThanOrEqual(BCRYPT_MAX_BYTES);
    expect(utf8ByteLength("가".repeat(25))).toBeGreaterThan(BCRYPT_MAX_BYTES);
  });
});

describe("USERNAME_PATTERN", () => {
  it.each(["minji123", "kim.minji-1", "홍길동01", "a_b"])("%s 는 허용한다", (name) => {
    expect(USERNAME_PATTERN.test(name)).toBe(true);
  });

  it.each(["<script>", "user name", "user@mail", "a'; DROP TABLE users;--", "줄\n바꿈"])(
    "%j 는 허용하지 않는다",
    (name) => {
      expect(USERNAME_PATTERN.test(name)).toBe(false);
    }
  );
});
