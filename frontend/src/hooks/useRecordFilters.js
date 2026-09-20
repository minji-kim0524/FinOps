import { useEffect, useState } from "react";

const PAGE_SIZE = 10;

// 이력 목록의 검색어·필터·정렬·페이지 상태와, 그 상태를 서버 쿼리 파라미터로 바꾸는 로직을 모은 훅.
export function useRecordFilters() {
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [minGrossPay, setMinGrossPay] = useState(null);
  const [maxGrossPay, setMaxGrossPay] = useState(null);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState(null); // "asc" | "desc" | null

  // 검색어는 입력할 때마다 바로 요청하지 않고, 타이핑이 멈춘 뒤 반영한다.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // 이력 목록 조회와 엑셀/ZIP 내보내기가 "현재 적용된 필터"를 동일하게 서버에 전달하기 위한 공통 파라미터.
  const buildFilterParams = () => {
    const params = {};
    if (debouncedSearchText) params.search = debouncedSearchText;
    if (selectedEmployee) params.employee_name = selectedEmployee;
    if (dateRange?.[0]) params.start_date = dateRange[0].startOf("day").format("YYYY-MM-DDTHH:mm:ss");
    if (dateRange?.[1]) params.end_date = dateRange[1].endOf("day").format("YYYY-MM-DDTHH:mm:ss");
    if (minGrossPay != null) params.min_gross_pay = minGrossPay;
    if (maxGrossPay != null) params.max_gross_pay = maxGrossPay;
    return params;
  };

  // 검색어를 제외한 필터는 값이 바뀌자마자 1페이지로 되돌린다.
  const updateSelectedEmployee = (value) => {
    setSelectedEmployee(value);
    setPage(1);
  };
  const updateDateRange = (value) => {
    setDateRange(value);
    setPage(1);
  };
  const updateMinGrossPay = (value) => {
    setMinGrossPay(value);
    setPage(1);
  };
  const updateMaxGrossPay = (value) => {
    setMaxGrossPay(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchText("");
    setDebouncedSearchText("");
    setSelectedEmployee(null);
    setDateRange(null);
    setMinGrossPay(null);
    setMaxGrossPay(null);
    setPage(1);
  };

  // antd Table의 onChange(pagination, filters, sorter)에서 그대로 전달받는 정렬 정보.
  // 정렬이 실제로 바뀐 경우에만 1페이지로 되돌리고, 페이지 이동만으로 호출된 경우(정렬 불변)는 그대로 둔다.
  const updateSort = (field, antdOrder) => {
    const nextSortBy = antdOrder ? field : null;
    const nextSortOrder = antdOrder === "descend" ? "desc" : antdOrder === "ascend" ? "asc" : null;
    if (nextSortBy === sortBy && nextSortOrder === sortOrder) return;
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize: PAGE_SIZE,
    searchText,
    setSearchText,
    debouncedSearchText,
    selectedEmployee,
    updateSelectedEmployee,
    dateRange,
    updateDateRange,
    minGrossPay,
    updateMinGrossPay,
    maxGrossPay,
    updateMaxGrossPay,
    sortBy,
    sortOrder,
    updateSort,
    resetFilters,
    buildFilterParams,
  };
}
