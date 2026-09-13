import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { downloadBlob } from "../utils/download";
import { useErrorReporter } from "./useErrorReporter";

const PAGE_SIZE = 10;

// 계산 이력 목록·필터·페이지네이션과 월별/연도별/직원별 집계를 함께 관리하는 훅.
// 화면(App.jsx)은 이 훅이 돌려주는 상태와 액션만 사용해 렌더링에만 집중한다.
export function useSalaryRecords({ message, modal, onLogout }) {
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState([]);
  const [yearlySummary, setYearlySummary] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [minGrossPay, setMinGrossPay] = useState(null);
  const [maxGrossPay, setMaxGrossPay] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const reportError = useErrorReporter({ message, onLogout });

  // 이력 목록 조회와 엑셀 내보내기가 "현재 적용된 필터"를 동일하게 서버에 전달하기 위한 공통 파라미터.
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

  const fetchRecords = async () => {
    try {
      const params = { page, page_size: PAGE_SIZE, ...buildFilterParams() };

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

  // 검색어는 입력할 때마다 바로 요청하지 않고, 타이핑이 멈춘 뒤 반영한다.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    fetchSummary();
    fetchYearlySummary();
    fetchEmployeeSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearchText, selectedEmployee, dateRange, minGrossPay, maxGrossPay]);

  const submitCalculation = async (payload) => {
    await api.post("/calculate", payload);
    await refreshAll();
  };

  const uploadBulkCsv = async ({ file }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/calculate/bulk", formData);
      const { created, errors } = response.data;
      await refreshAll();

      if (errors.length === 0) {
        message.success(`${created.length}건이 일괄 계산되었습니다.`);
      } else {
        if (created.length > 0) {
          message.warning(`${created.length}건 성공, ${errors.length}건 실패했습니다.`);
        } else {
          message.error("업로드에 실패했습니다. 아래 오류를 확인해주세요.");
        }
        modal.warning({
          title: "건너뛴 행이 있습니다",
          content: (
            <ul>
              {errors.map((e) => (
                <li key={e.row}>
                  {e.row}행: {e.reason}
                </li>
              ))}
            </ul>
          ),
        });
      }
    } catch (err) {
      if (err.response?.status === 400) {
        message.error(err.response.data?.detail || "CSV 파일을 확인해주세요.");
      } else {
        reportError(err, "CSV 일괄 업로드에 실패했습니다.");
      }
    } finally {
      setUploading(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const response = await api.get("/records/export", {
        params: buildFilterParams(),
        responseType: "blob",
      });
      downloadBlob(response.data, "salary_records.xlsx");
    } catch (err) {
      reportError(err, "엑셀 다운로드에 실패했습니다.");
    } finally {
      setExporting(false);
    }
  };

  const downloadPayslip = async (id) => {
    try {
      const response = await api.get(`/records/${id}/payslip`, { responseType: "blob" });
      downloadBlob(response.data, `payslip_${id}.pdf`);
    } catch (err) {
      reportError(err, "급여명세서 다운로드에 실패했습니다.");
    }
  };

  const updateRecord = async (id, payload) => {
    await api.put(`/records/${id}`, payload);
    await refreshAll();
  };

  const deleteRecord = async (id) => {
    await api.delete(`/records/${id}`);
    const result = await fetchRecords();
    if (result && result.items.length === 0 && page > 1) {
      setPage((p) => p - 1);
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

  return {
    records,
    totalRecords,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    summary,
    yearlySummary,
    employeeSummary,
    employeeOptions,
    searchText,
    setSearchText,
    selectedEmployee,
    updateSelectedEmployee,
    dateRange,
    updateDateRange,
    minGrossPay,
    updateMinGrossPay,
    maxGrossPay,
    updateMaxGrossPay,
    uploading,
    exporting,
    resetFilters,
    submitCalculation,
    uploadBulkCsv,
    exportToExcel,
    downloadPayslip,
    updateRecord,
    deleteRecord,
  };
}
