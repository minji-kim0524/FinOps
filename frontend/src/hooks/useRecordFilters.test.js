import { act, renderHook } from "@testing-library/react";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecordFilters } from "./useRecordFilters";

describe("useRecordFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("검색어는 입력 즉시가 아니라 300ms 뒤에 debouncedSearchText에 반영되고 페이지가 1로 리셋된다", () => {
    const { result } = renderHook(() => useRecordFilters());

    act(() => {
      result.current.setPage(3);
    });
    act(() => {
      result.current.setSearchText("홍길동");
    });

    expect(result.current.searchText).toBe("홍길동");
    expect(result.current.debouncedSearchText).toBe("");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.debouncedSearchText).toBe("홍길동");
    expect(result.current.page).toBe(1);
  });

  it("직원/급여 범위 등 검색어 외 필터를 바꾸면 값이 바뀌자마자 1페이지로 되돌아간다", () => {
    const { result } = renderHook(() => useRecordFilters());

    act(() => {
      result.current.setPage(5);
    });
    act(() => {
      result.current.updateSelectedEmployee("홍길동");
    });

    expect(result.current.selectedEmployee).toBe("홍길동");
    expect(result.current.page).toBe(1);
  });

  it("최대 급여 필터를 바꾸면 값이 바뀌자마자 1페이지로 되돌아간다", () => {
    const { result } = renderHook(() => useRecordFilters());

    act(() => {
      result.current.setPage(5);
    });
    act(() => {
      result.current.updateMaxGrossPay(5_000_000);
    });

    expect(result.current.maxGrossPay).toBe(5_000_000);
    expect(result.current.page).toBe(1);
  });

  it("계산일 범위 필터를 바꾸면 값이 바뀌자마자 1페이지로 되돌아간다", () => {
    // updateDateRange 자체는 값을 그대로 저장하고 페이지만 리셋할 뿐, dayjs 객체의
    // startOf/endOf는 buildFilterParams가 호출될 때 쓰이므로 여기서는 단순 마커로 충분하다.
    const range = ["start-marker", "end-marker"];
    const { result } = renderHook(() => useRecordFilters());

    act(() => {
      result.current.setPage(5);
    });
    act(() => {
      result.current.updateDateRange(range);
    });

    expect(result.current.dateRange).toBe(range);
    expect(result.current.page).toBe(1);
  });

  it("buildFilterParams는 값이 설정된 필터만 쿼리 파라미터로 만든다", () => {
    const { result } = renderHook(() => useRecordFilters());

    expect(result.current.buildFilterParams()).toEqual({});

    act(() => {
      result.current.updateMinGrossPay(1_000_000);
    });

    expect(result.current.buildFilterParams()).toEqual({ min_gross_pay: 1_000_000 });
  });

  it("buildFilterParams는 계산일 범위를 시작일 00:00:00 ~ 종료일 23:59:59로 변환한다", () => {
    const { result } = renderHook(() => useRecordFilters());
    const start = dayjs("2026-01-01T15:00:00");
    const end = dayjs("2026-01-31T09:00:00");

    act(() => {
      result.current.updateDateRange([start, end]);
    });

    expect(result.current.buildFilterParams()).toEqual({
      start_date: "2026-01-01T00:00:00",
      end_date: "2026-01-31T23:59:59",
    });
  });

  it("resetFilters는 모든 필터 값을 초기 상태로 되돌린다", () => {
    const { result } = renderHook(() => useRecordFilters());

    act(() => {
      result.current.setSearchText("홍길동");
      result.current.updateSelectedEmployee("홍길동");
      result.current.updateMinGrossPay(1_000_000);
      result.current.setPage(5);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.searchText).toBe("");
    expect(result.current.debouncedSearchText).toBe("");
    expect(result.current.selectedEmployee).toBeNull();
    expect(result.current.minGrossPay).toBeNull();
    expect(result.current.page).toBe(1);
  });

  it("정렬을 처음 적용하면 antd 정렬 방향을 sort_by/sort_order로 바꾸고 1페이지로 되돌아간다", () => {
    const { result } = renderHook(() => useRecordFilters());

    act(() => {
      result.current.setPage(3);
    });
    act(() => {
      result.current.updateSort("gross_pay", "descend");
    });

    expect(result.current.sortBy).toBe("gross_pay");
    expect(result.current.sortOrder).toBe("desc");
    expect(result.current.page).toBe(1);
  });

  it("정렬이 바뀌지 않았다면(같은 컬럼·방향) 페이지를 그대로 유지한다", () => {
    // antd Table의 onChange는 순수 페이지네이션 클릭에도 현재 정렬 정보를 그대로 함께 넘긴다.
    const { result } = renderHook(() => useRecordFilters());

    act(() => {
      result.current.updateSort("gross_pay", "ascend");
    });
    act(() => {
      result.current.setPage(4);
    });
    act(() => {
      result.current.updateSort("gross_pay", "ascend");
    });

    expect(result.current.page).toBe(4);
  });

  it("정렬을 해제하면(antdOrder 없음) sortBy/sortOrder가 모두 null이 된다", () => {
    const { result } = renderHook(() => useRecordFilters());

    act(() => {
      result.current.updateSort("gross_pay", "ascend");
    });
    act(() => {
      result.current.updateSort("gross_pay", undefined);
    });

    expect(result.current.sortBy).toBeNull();
    expect(result.current.sortOrder).toBeNull();
  });
});
