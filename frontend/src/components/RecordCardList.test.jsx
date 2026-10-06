import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecordCardList from "./RecordCardList";

const RECORD = {
  id: 7,
  created_at: "2026-10-06T11:54:00",
  employee_name: "김민지",
  gross_pay: 4_000_000,
  bonus_pay: 200_000,
  num_dependents: 3,
  num_children_8_to_20: 1,
  national_pension: 189_000,
  health_insurance: 148_890,
  long_term_care: 19_281,
  employment_insurance: 37_800,
  income_tax: 134_040,
  local_income_tax: 13_404,
  total_deduction: 542_415,
  net_pay: 3_657_585,
};

function renderList(overrides = {}) {
  const props = {
    records: [RECORD],
    loading: false,
    page: 1,
    pageSize: 10,
    total: 1,
    onPageChange: vi.fn(),
    sortBy: null,
    sortOrder: null,
    onSortChange: vi.fn(),
    onDownloadPayslip: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    emptyText: "아직 계산 이력이 없습니다.",
    ...overrides,
  };
  render(<RecordCardList {...props} />);
  return props;
}

describe("RecordCardList", () => {
  it("카드마다 직원명·계산일시·실수령액과 세전 총 지급액(급여+상여금)·공제액 합계를 먼저 보여준다", () => {
    renderList();

    const card = screen.getByLabelText("김민지 급여 이력");
    expect(within(card).getByText("2026-10-06 11:54")).toBeInTheDocument();
    expect(within(card).getByText("3,657,585원")).toBeInTheDocument();
    expect(within(card).getByText("4,200,000원")).toBeInTheDocument(); // 4,000,000 + 200,000
    expect(within(card).getByText("542,415원")).toBeInTheDocument();
    // 상세 항목은 펼치기 전에는 보이지 않는다.
    expect(within(card).queryByText("국민연금")).not.toBeInTheDocument();
  });

  it("직원명이 없으면 '-'로 표시한다", () => {
    renderList({ records: [{ ...RECORD, employee_name: "" }] });

    expect(screen.getByLabelText("- 급여 이력")).toBeInTheDocument();
  });

  it("'상세 내역 보기'를 누르면 공제 항목 전체가 펼쳐지고 다시 누르면 접힌다", async () => {
    const user = userEvent.setup();
    renderList();

    const toggle = screen.getByRole("button", { name: /상세 내역 보기/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(screen.getByRole("button", { name: /상세 내역 접기/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("국민연금")).toBeInTheDocument();
    expect(screen.getByText("189,000원")).toBeInTheDocument();
    expect(screen.getByText("3명")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /상세 내역 접기/ }));

    expect(screen.queryByText("국민연금")).not.toBeInTheDocument();
  });

  it("명세서·수정 버튼은 해당 이력으로 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const props = renderList();

    await user.click(screen.getByRole("button", { name: "명세서" }));
    await user.click(screen.getByRole("button", { name: "수정" }));

    expect(props.onDownloadPayslip).toHaveBeenCalledWith(7);
    expect(props.onEdit).toHaveBeenCalledWith(RECORD);
  });

  it("삭제는 확인을 거친 뒤에만 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const props = renderList();

    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(props.onDelete).not.toHaveBeenCalled();

    // 확인 창이 열리면 "삭제" 버튼이 하나 더 생긴다(마지막이 확인 창의 버튼).
    await screen.findByText("이 계산 이력을 삭제하시겠습니까?");
    await user.click(screen.getAllByRole("button", { name: "삭제" }).at(-1));

    expect(props.onDelete).toHaveBeenCalledWith(7);
  });

  it("이력이 없으면 안내 문구를 보여준다", () => {
    renderList({ records: [], total: 0, emptyText: "조건에 맞는 계산 이력이 없습니다." });

    expect(screen.getByText("조건에 맞는 계산 이력이 없습니다.")).toBeInTheDocument();
  });

  it("전체 건수가 한 페이지 이하이면 페이지 이동 UI를 숨긴다", () => {
    renderList({ total: 10, pageSize: 10 });

    expect(document.querySelector(".ant-pagination")).toBeNull();
  });

  it("전체 건수가 한 페이지를 넘으면 페이지 이동 UI를 보여주고 페이지를 바꾸면 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const props = renderList({ total: 23 });

    await user.click(screen.getByTitle("2"));

    expect(props.onPageChange).toHaveBeenCalledWith(2, 10);
  });

  it("정렬 선택 상자에서 고른 조합을 표 헤더 정렬과 같은 형식으로 전달한다", async () => {
    const user = userEvent.setup();
    const props = renderList();

    await user.click(screen.getByRole("combobox", { name: "정렬" }));
    await user.click(await screen.findByTitle("실수령액 높은 순"));

    expect(props.onSortChange).toHaveBeenCalledWith("net_pay", "descend");
  });

  it("'등록순'을 고르면 정렬을 해제한다", async () => {
    const user = userEvent.setup();
    const props = renderList({ sortBy: "net_pay", sortOrder: "desc" });

    await user.click(screen.getByRole("combobox", { name: "정렬" }));
    await user.click(await screen.findByTitle("등록순"));

    expect(props.onSortChange).toHaveBeenCalledWith(null, null);
  });

  it("현재 적용된 정렬을 선택 상자에 반영한다", () => {
    renderList({ sortBy: "created_at", sortOrder: "desc" });

    expect(screen.getByText("최근 계산순")).toBeInTheDocument();
  });
});
