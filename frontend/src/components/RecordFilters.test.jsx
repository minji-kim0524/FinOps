import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import RecordFilters from "./RecordFilters";

function renderFilters(overrides = {}) {
  const props = {
    searchText: "",
    onSearchTextChange: vi.fn(),
    selectedEmployee: null,
    onSelectedEmployeeChange: vi.fn(),
    employeeOptions: [{ label: "홍길동", value: "홍길동" }],
    dateRange: null,
    onDateRangeChange: vi.fn(),
    minGrossPay: null,
    onMinGrossPayChange: vi.fn(),
    maxGrossPay: null,
    onMaxGrossPayChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  const view = render(<RecordFilters {...props} />);
  return { props, ...view };
}

describe("RecordFilters", () => {
  it("검색어 입력과 필터 초기화를 부모 콜백으로 전달한다", async () => {
    const user = userEvent.setup();
    const { props } = renderFilters();

    await user.type(screen.getByPlaceholderText("직원명으로 검색"), "홍");
    await user.click(screen.getByRole("button", { name: "필터 초기화" }));

    expect(props.onSearchTextChange).toHaveBeenCalledWith("홍");
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it("좁은 화면용 '필터' 버튼은 누를 때마다 패널 펼침 상태(aria-expanded)를 바꾼다", async () => {
    const user = userEvent.setup();
    const { container } = renderFilters();
    const toggle = screen.getByRole("button", { name: /^필터$|필터/, expanded: false });

    expect(container.querySelector(".record-filters")).not.toHaveClass("is-open");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector(".record-filters")).toHaveClass("is-open");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector(".record-filters")).not.toHaveClass("is-open");
  });

  it("접힌 패널 안의 필터가 적용되어 있으면 '필터' 버튼 배지에 개수를 보여준다", () => {
    renderFilters({
      selectedEmployee: "홍길동",
      dateRange: [dayjs("2026-10-01"), dayjs("2026-10-31")],
      minGrossPay: 1_000_000,
    });

    expect(screen.getByTitle("3")).toBeInTheDocument();
  });

  it("적용된 필터가 없으면 배지를 보여주지 않는다", () => {
    const { container } = renderFilters();

    expect(container.querySelector(".ant-badge-count")).toBeNull();
  });

  it("검색어는 항상 보이는 영역에 있어 배지 개수에 포함하지 않는다", () => {
    const { container } = renderFilters({ searchText: "홍" });

    expect(container.querySelector(".ant-badge-count")).toBeNull();
  });

  it("최소 급여가 최대 급여보다 크면 조회 결과가 없다는 안내를 보여준다", () => {
    renderFilters({ minGrossPay: 5_000_000, maxGrossPay: 1_000_000 });

    expect(screen.getByText("최소 급여가 최대 급여보다 커서 조회 결과가 없습니다. 값을 확인해주세요.")).toBeInTheDocument();
  });

  it("금액 입력칸은 천 단위 구분 쉼표로 보여주고 쉼표 없는 숫자를 콜백으로 넘긴다", async () => {
    const user = userEvent.setup();
    const { props } = renderFilters({ minGrossPay: 3_000_000 });

    const minInput = screen.getByPlaceholderText("최소 급여");
    expect(minInput).toHaveValue("3,000,000");

    await user.clear(minInput);
    await user.type(minInput, "1500000");

    expect(props.onMinGrossPayChange).toHaveBeenLastCalledWith(1_500_000);
  });
});
