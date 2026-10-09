import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalculationResult from "./CalculationResult";

const RESULT = {
  id: 1,
  employee_name: "홍길동",
  gross_pay: 3_000_000,
  bonus_pay: 1_000_000,
  national_pension: 180_000,
  health_insurance: 141_800,
  long_term_care: 18_363,
  employment_insurance: 36_000,
  income_tax: 195_960,
  local_income_tax: 19_596,
  total_deduction: 591_719,
  net_pay: 3_408_281,
};

function renderResult(overrides = {}) {
  const props = { result: RESULT, onViewInHistory: vi.fn(), onClose: vi.fn(), ...overrides };
  render(<CalculationResult {...props} />);
  return props;
}

describe("CalculationResult", () => {
  it("실수령액, 세전 총 지급액(급여+상여금), 공제액 합계를 보여준다", () => {
    renderResult();

    const panel = screen.getByRole("status", { name: "계산 결과" });
    expect(within(panel).getByText("홍길동")).toBeInTheDocument();
    expect(within(panel).getByText("3,408,281원")).toBeInTheDocument();
    expect(within(panel).getByText("4,000,000원")).toBeInTheDocument();
    expect(within(panel).getByText("591,719원")).toBeInTheDocument();
  });

  it("공제 항목 6개를 각각 보여준다", () => {
    renderResult();

    const expected = {
      국민연금: "180,000원",
      건강보험: "141,800원",
      장기요양보험: "18,363원",
      고용보험: "36,000원",
      소득세: "195,960원",
      지방소득세: "19,596원",
    };
    for (const [label, amount] of Object.entries(expected)) {
      const term = screen.getByText(label, { selector: "dt" });
      expect(term.nextElementSibling).toHaveTextContent(amount);
    }
  });

  it("직원명을 입력하지 않았으면 '이름 없음'으로 표시한다", () => {
    renderResult({ result: { ...RESULT, employee_name: "" } });

    expect(screen.getByText("이름 없음")).toBeInTheDocument();
  });

  it("'이력에서 보기'와 '닫기'는 각자의 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const props = renderResult();

    await user.click(screen.getByRole("button", { name: "이력에서 보기" }));
    await user.click(screen.getByRole("button", { name: "계산 결과 닫기" }));

    expect(props.onViewInHistory).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("스크린리더가 결과가 나타난 것을 알 수 있도록 status 역할을 가진다", () => {
    renderResult();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
