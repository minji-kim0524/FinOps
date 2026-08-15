import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntApp } from "antd";
import LoginPage from "./LoginPage";
import api from "./api";

vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderLoginPage() {
  const onLogin = vi.fn();
  render(
    <AntApp>
      <LoginPage onLogin={onLogin} />
    </AntApp>
  );
  return { onLogin };
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("아이디/비밀번호 입력창과 로그인 버튼을 보여준다", () => {
    renderLoginPage();

    expect(screen.getByLabelText("아이디")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  it("회원가입으로 전환하면 제출 버튼 텍스트가 바뀐다", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByText("회원가입"));

    expect(screen.getByRole("button", { name: "회원가입" })).toBeInTheDocument();
  });

  it("로그인에 성공하면 onLogin이 발급된 토큰과 함께 호출된다", async () => {
    api.post.mockResolvedValueOnce({ data: { access_token: "test-token" } });
    const user = userEvent.setup();
    const { onLogin } = renderLoginPage();

    await user.type(screen.getByLabelText("아이디"), "tester");
    await user.type(screen.getByLabelText("비밀번호"), "pass1234");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        username: "tester",
        password: "pass1234",
      });
    });
    expect(onLogin).toHaveBeenCalledWith("test-token");
  });

  it("로그인에 실패하면 에러 메시지를 보여주고 onLogin을 호출하지 않는다", async () => {
    api.post.mockRejectedValueOnce({ response: { status: 401 } });
    const user = userEvent.setup();
    const { onLogin } = renderLoginPage();

    await user.type(screen.getByLabelText("아이디"), "tester");
    await user.type(screen.getByLabelText("비밀번호"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("아이디 또는 비밀번호가 올바르지 않습니다.")
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
