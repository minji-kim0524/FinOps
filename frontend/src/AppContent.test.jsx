import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntApp } from "antd";
import AppContent from "./AppContent";
import api from "./api";

vi.mock("./api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// recharts는 jsdom에서 크기를 계산하지 못해 경고만 늘리므로, 이 테스트의 관심사(계산 흐름)와 무관한 차트는 비운다.
vi.mock("./components/GrossPayVsNetPayChart", () => ({ default: () => null }));
vi.mock("./components/MonthlyTrendChart", () => ({ default: () => null }));

const CREATED = {
  id: 1,
  created_at: "2026-10-10T10:00:00",
  employee_name: "홍길동",
  gross_pay: 3_000_000,
  bonus_pay: 0,
  num_dependents: 1,
  num_children_8_to_20: 0,
  national_pension: 135_000,
  health_insurance: 106_350,
  long_term_care: 13_772,
  employment_insurance: 27_000,
  income_tax: 74_350,
  local_income_tax: 7_435,
  total_deduction: 363_907,
  net_pay: 2_636_093,
};

function renderApp() {
  render(
    <AntApp>
      <AppContent onLogout={vi.fn()} themeToggle={null} />
    </AntApp>
  );
}

async function calculate(user) {
  await user.type(screen.getByPlaceholderText("직원명"), "홍길동");
  await user.type(screen.getByPlaceholderText("세전 급여"), "3000000");
  await user.click(screen.getByRole("button", { name: "계산하기" }));
}

describe("AppContent 계산 흐름", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation(async (url) =>
      url === "/records" ? { data: { items: [], total: 0 } } : { data: [] }
    );
    api.post.mockResolvedValue({ data: CREATED });
  });

  it("계산하면 서버 응답의 실수령액·공제 내역을 폼 아래 결과 패널로 바로 보여주고 폼을 초기화한다", async () => {
    const user = userEvent.setup();
    renderApp();

    await calculate(user);

    const panel = await screen.findByRole("status", { name: "계산 결과" });
    expect(panel).toHaveTextContent("홍길동");
    expect(panel).toHaveTextContent("2,636,093원");
    expect(panel).toHaveTextContent("363,907원");
    expect(api.post).toHaveBeenCalledWith("/calculate", {
      employee_name: "홍길동",
      gross_pay: 3_000_000,
      bonus_pay: 0,
      num_dependents: 1,
      num_children_8_to_20: 0,
    });
    expect(screen.getByPlaceholderText("직원명")).toHaveValue("");
  });

  it("계산에 실패하면 결과 패널을 보여주지 않는다", async () => {
    api.post.mockRejectedValueOnce({ response: { status: 500 } });
    const user = userEvent.setup();
    renderApp();

    await calculate(user);

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(screen.queryByRole("status", { name: "계산 결과" })).not.toBeInTheDocument();
  });

  it("'닫기'를 누르면 결과 패널이 사라진다", async () => {
    const user = userEvent.setup();
    renderApp();
    await calculate(user);
    await screen.findByRole("status", { name: "계산 결과" });

    await user.click(screen.getByRole("button", { name: "계산 결과 닫기" }));

    expect(screen.queryByRole("status", { name: "계산 결과" })).not.toBeInTheDocument();
  });

  it("'이력에서 보기'는 최근 계산순 첫 페이지로 이력을 다시 조회한다", async () => {
    const user = userEvent.setup();
    renderApp();
    await calculate(user);
    await screen.findByRole("status", { name: "계산 결과" });
    api.get.mockClear();

    await user.click(screen.getByRole("button", { name: "이력에서 보기" }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/records", {
        params: expect.objectContaining({ page: 1, sort_by: "created_at", sort_order: "desc" }),
      });
    });
  });
});
