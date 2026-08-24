import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("회원가입으로 전환하면 제출 버튼 텍스트가 바뀌고 보안 질문 입력창이 나타난다", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByText("회원가입"));

    expect(screen.getByRole("button", { name: "회원가입" })).toBeInTheDocument();
    expect(screen.getByLabelText("보안 질문")).toBeInTheDocument();
    expect(screen.getByLabelText("보안 답변")).toBeInTheDocument();
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

  it("비밀번호를 잊으셨나요 클릭 시 아이디로 보안 질문을 조회하고, 답변으로 재설정한다", async () => {
    api.post.mockResolvedValueOnce({ data: { security_question: "가장 좋아하는 음식은?" } });
    api.post.mockResolvedValueOnce({ data: { status: "ok" } });
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByText("비밀번호를 잊으셨나요?"));
    const dialog = screen.getByRole("dialog", { name: "비밀번호 재설정" });
    await user.type(within(dialog).getByLabelText("아이디"), "tester");
    await user.click(within(dialog).getByRole("button", { name: "다음" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/security-question", { username: "tester" });
    });
    expect(await screen.findByDisplayValue("가장 좋아하는 음식은?")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("보안 답변"), "김치찌개");
    await user.type(within(dialog).getByLabelText("새 비밀번호"), "newpass123");
    await user.type(within(dialog).getByLabelText("새 비밀번호 확인"), "newpass123");
    await user.click(within(dialog).getByRole("button", { name: "비밀번호 재설정" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/password-reset", {
        username: "tester",
        security_answer: "김치찌개",
        new_password: "newpass123",
      });
    });
  });
});
