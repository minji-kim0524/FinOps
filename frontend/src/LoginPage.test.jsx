import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntApp } from "antd";
import LoginPage, { describeAuthError } from "./LoginPage";
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

  it("회원가입 시 형식에 맞지 않는 아이디는 서버로 보내지 않고 사유를 보여준다", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByText("회원가입"));
    await user.type(screen.getByLabelText("아이디"), "<script>alert(1)</script>");
    await user.type(screen.getByLabelText("비밀번호"), "pass1234");
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(
      await screen.findByText("아이디에는 영문, 숫자, 한글, 밑줄(_), 마침표(.), 하이픈(-)만 사용할 수 있습니다")
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("회원가입 시 UTF-8 72바이트를 넘는 비밀번호는 서버로 보내지 않는다", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByText("회원가입"));
    await user.type(screen.getByLabelText("아이디"), "tester");
    // 한글 25자는 글자 수는 적어도 75바이트라 bcrypt 한도를 넘는다.
    await user.type(screen.getByLabelText("비밀번호"), `a1${"가".repeat(25)}`);
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByText(/비밀번호가 너무 깁니다/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("로그인 화면은 아이디 형식을 검사하지 않아 과거에 가입한 아이디도 그대로 시도할 수 있다", async () => {
    api.post.mockResolvedValueOnce({ data: { access_token: "t" } });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("아이디"), "old user@mail");
    await user.type(screen.getByLabelText("비밀번호"), "pass1234");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/auth/login", {
        username: "old user@mail",
        password: "pass1234",
      });
    });
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

  it("백엔드 서버에 연결할 수 없으면 네트워크 오류 메시지를 보여준다", async () => {
    api.post.mockRejectedValueOnce(new Error("Network Error"));
    const user = userEvent.setup();
    const { onLogin } = renderLoginPage();

    await user.type(screen.getByLabelText("아이디"), "tester");
    await user.type(screen.getByLabelText("비밀번호"), "pass1234");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.")
    ).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  describe("describeAuthError", () => {
    it("응답 자체가 없으면(네트워크 오류) 서버 연결 실패 메시지를 반환한다", () => {
      expect(describeAuthError(new Error("Network Error"), "login")).toBe(
        "서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요."
      );
    });

    it("429는 rate limit 메시지를 반환한다", () => {
      const err = { response: { status: 429 } };
      expect(describeAuthError(err, "register")).toBe(
        "너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요."
      );
    });

    it("회원가입 중 아이디 중복(400)은 전용 메시지를 반환한다", () => {
      const err = { response: { status: 400 } };
      expect(describeAuthError(err, "register")).toBe("이미 사용 중인 아이디입니다.");
    });

    it("회원가입 중 검증 실패(422)는 백엔드가 알려준 이유를 그대로 반환한다", () => {
      const err = {
        response: {
          status: 422,
          data: { detail: [{ msg: "Value error, 비밀번호는 최소 8자 이상이어야 합니다" }] },
        },
      };
      expect(describeAuthError(err, "register")).toBe("비밀번호는 최소 8자 이상이어야 합니다");
    });

    it("로그인 실패는 이유를 구분하지 않고 공통 메시지를 반환한다", () => {
      const err = { response: { status: 401 } };
      expect(describeAuthError(err, "login")).toBe("아이디 또는 비밀번호가 올바르지 않습니다.");
    });

    it("로그인이 계정 잠금(423)으로 실패하면 백엔드가 알려준 대기 안내를 그대로 반환한다", () => {
      const err = {
        response: {
          status: 423,
          data: { detail: "로그인 실패 횟수를 초과해 계정이 잠겼습니다. 15분 후 다시 시도해주세요." },
        },
      };
      expect(describeAuthError(err, "login")).toBe(
        "로그인 실패 횟수를 초과해 계정이 잠겼습니다. 15분 후 다시 시도해주세요."
      );
    });
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

  it("비밀번호 재설정이 계정 잠금(423)으로 실패하면 백엔드가 알려준 대기 안내를 보여준다", async () => {
    api.post.mockResolvedValueOnce({ data: { security_question: "가장 좋아하는 음식은?" } });
    api.post.mockRejectedValueOnce({
      response: {
        status: 423,
        data: { detail: "로그인 실패 횟수를 초과해 계정이 잠겼습니다. 15분 후 다시 시도해주세요." },
      },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByText("비밀번호를 잊으셨나요?"));
    const dialog = screen.getByRole("dialog", { name: "비밀번호 재설정" });
    await user.type(within(dialog).getByLabelText("아이디"), "tester");
    await user.click(within(dialog).getByRole("button", { name: "다음" }));
    await screen.findByDisplayValue("가장 좋아하는 음식은?");

    await user.type(within(dialog).getByLabelText("보안 답변"), "김치찌개");
    await user.type(within(dialog).getByLabelText("새 비밀번호"), "newpass123");
    await user.type(within(dialog).getByLabelText("새 비밀번호 확인"), "newpass123");
    await user.click(within(dialog).getByRole("button", { name: "비밀번호 재설정" }));

    expect(
      await screen.findByText("로그인 실패 횟수를 초과해 계정이 잠겼습니다. 15분 후 다시 시도해주세요.")
    ).toBeInTheDocument();
    // 잠겨서 실패했으므로 모달은 닫히지 않고 그대로 열려 있어야 한다.
    expect(screen.getByRole("dialog", { name: "비밀번호 재설정" })).toBeInTheDocument();
  });
});
