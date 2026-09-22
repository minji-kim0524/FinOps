import { describe, expect, it, vi } from "vitest";
import { useErrorReporter } from "./useErrorReporter";

describe("useErrorReporter", () => {
  it("401 응답이면 인증 만료 메시지를 띄우고 로그아웃 콜백을 호출한다", () => {
    const message = { error: vi.fn() };
    const onLogout = vi.fn();
    const reportError = useErrorReporter({ message, onLogout });

    reportError({ response: { status: 401 } }, "폴백 메시지");

    expect(message.error).toHaveBeenCalledWith("로그인이 만료되었습니다. 다시 로그인해주세요.");
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("403 응답도 동일하게 인증 만료로 처리한다", () => {
    const message = { error: vi.fn() };
    const onLogout = vi.fn();
    const reportError = useErrorReporter({ message, onLogout });

    reportError({ response: { status: 403 } }, "폴백 메시지");

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("그 외 응답 오류는 로그아웃 없이 전달받은 폴백 메시지를 보여준다", () => {
    const message = { error: vi.fn() };
    const onLogout = vi.fn();
    const reportError = useErrorReporter({ message, onLogout });

    reportError({ response: { status: 500 } }, "서버 오류가 발생했습니다.");

    expect(message.error).toHaveBeenCalledWith("서버 오류가 발생했습니다.");
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("응답 자체가 없는 오류(네트워크 오류)도 폴백 메시지를 보여준다", () => {
    const message = { error: vi.fn() };
    const onLogout = vi.fn();
    const reportError = useErrorReporter({ message, onLogout });

    reportError(new Error("Network Error"), "서버에 연결할 수 없습니다.");

    expect(message.error).toHaveBeenCalledWith("서버에 연결할 수 없습니다.");
    expect(onLogout).not.toHaveBeenCalled();
  });
});
