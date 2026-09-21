import { describe, expect, it } from "vitest";
import { formatWon } from "./format";

describe("formatWon", () => {
  it("천 단위 구분 기호와 '원'을 붙여 반환한다", () => {
    expect(formatWon(3000000)).toBe("3,000,000원");
  });

  it("0원도 올바르게 표기한다", () => {
    expect(formatWon(0)).toBe("0원");
  });

  it("음수도 부호를 유지한 채 표기한다", () => {
    expect(formatWon(-1500)).toBe("-1,500원");
  });
});
