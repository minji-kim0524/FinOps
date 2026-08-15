import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import api from "./api";

vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [] });
  });

  it("토큰이 없으면 로그인 화면을 보여준다", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it("토큰이 있으면 메인 화면을 보여주고 이력·월별 집계를 불러온다", async () => {
    localStorage.setItem("token", "test-token");

    render(<App />);

    expect(await screen.findByRole("button", { name: "로그아웃" })).toBeInTheDocument();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/records");
      expect(api.get).toHaveBeenCalledWith("/records/summary");
    });
  });

  it("로그아웃하면 토큰을 지우고 로그인 화면으로 돌아간다", async () => {
    localStorage.setItem("token", "test-token");
    const user = userEvent.setup();

    render(<App />);

    const logoutButton = await screen.findByRole("button", { name: "로그아웃" });
    await user.click(logoutButton);

    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
