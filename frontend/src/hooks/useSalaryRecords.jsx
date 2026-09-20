import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useErrorReporter } from "./useErrorReporter";
import { useRecordFilters } from "./useRecordFilters";
import { useRecordExports } from "./useRecordExports";

// 계산 이력 목록·집계 조회와 CRUD를 관리하고, 필터/정렬(useRecordFilters)과 파일 다운로드
// (useRecordExports)를 조합해 화면(App.jsx)에는 하나의 인터페이스로 노출하는 훅.
export function useSalaryRecords({ message, modal, onLogout }) {
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summary, setSummary] = useState([]);
  const [yearlySummary, setYearlySummary] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState([]);

  const reportError = useErrorReporter({ message, onLogout });
  const filters = useRecordFilters();

  const fetchRecords = async () => {
    try {
      const params = { page: filters.page, page_size: filters.pageSize, ...filters.buildFilterParams() };
      if (filters.sortBy) {
        params.sort_by = filters.sortBy;
        params.sort_order = filters.sortOrder;
      }

      const response = await api.get("/records", { params });
      setRecords(response.data.items);
      setTotalRecords(response.data.total);
      return response.data;
    } catch (err) {
      reportError(err, "계산 이력을 불러오지 못했습니다.");
      return null;
    }
  };

  // 월별/연도별/직원별 집계는 "URL만 다르고 나머지는 동일한" 조회이므로 한 헬퍼로 모은다.
  const fetchAndStore = async (url, setState, errorMessage) => {
    try {
      const response = await api.get(url);
      setState(response.data);
    } catch (err) {
      reportError(err, errorMessage);
    }
  };

  const fetchSummary = () =>
    fetchAndStore("/records/summary", setSummary, "월별 집계를 불러오지 못했습니다.");
  const fetchYearlySummary = () =>
    fetchAndStore("/records/summary/yearly", setYearlySummary, "연도별 집계를 불러오지 못했습니다.");
  const fetchEmployeeSummary = () =>
    fetchAndStore("/records/summary/by-employee", setEmployeeSummary, "직원별 집계를 불러오지 못했습니다.");

  const refreshAll = async () => {
    await Promise.all([fetchRecords(), fetchSummary(), fetchYearlySummary(), fetchEmployeeSummary()]);
  };

  const exports = useRecordExports({
    message,
    modal,
    onLogout,
    buildFilterParams: filters.buildFilterParams,
    refreshAll,
  });

  useEffect(() => {
    fetchSummary();
    fetchYearlySummary();
    fetchEmployeeSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.page,
    filters.debouncedSearchText,
    filters.selectedEmployee,
    filters.dateRange,
    filters.minGrossPay,
    filters.maxGrossPay,
    filters.sortBy,
    filters.sortOrder,
  ]);

  const submitCalculation = async (payload) => {
    await api.post("/calculate", payload);
    await refreshAll();
  };

  const updateRecord = async (id, payload) => {
    await api.put(`/records/${id}`, payload);
    await refreshAll();
  };

  const deleteRecord = async (id) => {
    await api.delete(`/records/${id}`);
    const result = await fetchRecords();
    if (result && result.items.length === 0 && filters.page > 1) {
      filters.setPage((p) => p - 1);
    }
    await Promise.all([fetchSummary(), fetchYearlySummary(), fetchEmployeeSummary()]);
  };

  // 직원 필터 드롭다운은 전체 이력을 대상으로 하는 직원별 집계에서 목록을 가져온다.
  // (records는 현재 페이지분만 있어 일부 직원이 빠질 수 있음)
  const employeeOptions = useMemo(() => {
    return employeeSummary
      .filter((row) => row.employee_name !== "(미지정)")
      .map((row) => ({ label: row.employee_name, value: row.employee_name }));
  }, [employeeSummary]);

  return {
    records,
    totalRecords,
    page: filters.page,
    setPage: filters.setPage,
    pageSize: filters.pageSize,
    summary,
    yearlySummary,
    employeeSummary,
    employeeOptions,
    searchText: filters.searchText,
    setSearchText: filters.setSearchText,
    selectedEmployee: filters.selectedEmployee,
    updateSelectedEmployee: filters.updateSelectedEmployee,
    dateRange: filters.dateRange,
    updateDateRange: filters.updateDateRange,
    minGrossPay: filters.minGrossPay,
    updateMinGrossPay: filters.updateMinGrossPay,
    maxGrossPay: filters.maxGrossPay,
    updateMaxGrossPay: filters.updateMaxGrossPay,
    updateSort: filters.updateSort,
    uploading: exports.uploading,
    exporting: exports.exporting,
    downloadingPayslips: exports.downloadingPayslips,
    resetFilters: filters.resetFilters,
    submitCalculation,
    uploadBulkCsv: exports.uploadBulkCsv,
    exportToExcel: exports.exportToExcel,
    downloadCsvTemplate: exports.downloadCsvTemplate,
    downloadPayslipsZip: exports.downloadPayslipsZip,
    downloadPayslip: exports.downloadPayslip,
    updateRecord,
    deleteRecord,
  };
}
