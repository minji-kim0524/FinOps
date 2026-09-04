import { useMemo, useState } from "react";
import { App as AntApp, Button, ConfigProvider, Form, Space, Table, theme as antdTheme } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import "antd/dist/reset.css";
import "./App.css";
import api from "./api";
import LoginPage from "./LoginPage";
import { useTheme } from "./hooks/useTheme";
import { useErrorReporter } from "./hooks/useErrorReporter";
import { useSalaryRecords } from "./hooks/useSalaryRecords";
import {
  EMPLOYEE_SUMMARY_COLUMNS,
  MONTHLY_SUMMARY_COLUMNS,
  YEARLY_SUMMARY_COLUMNS,
  buildRecordColumns,
} from "./tableColumns";
import CalculateForm from "./components/CalculateForm";
import BulkActions from "./components/BulkActions";
import RecordFilters from "./components/RecordFilters";
import EditRecordModal from "./components/EditRecordModal";
import ChangePasswordModal from "./components/ChangePasswordModal";
import GrossPayVsNetPayChart from "./components/GrossPayVsNetPayChart";
import MonthlyTrendChart from "./components/MonthlyTrendChart";
import SummaryTable from "./components/SummaryTable";

function toSalaryPayload(values) {
  return {
    employee_name: values.employee_name || "",
    gross_pay: values.gross_pay,
    num_dependents: values.num_dependents,
    num_children_8_to_20: values.num_children_8_to_20 || 0,
  };
}

function AppContent({ onLogout }) {
  const { message, modal } = AntApp.useApp();
  const reportError = useErrorReporter({ message, onLogout });
  const salary = useSalaryRecords({ message, modal, onLogout });

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [editingRecord, setEditingRecord] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleCalculate = async (values) => {
    try {
      await salary.submitCalculation(toSalaryPayload(values));
      form.resetFields();
      form.setFieldsValue({ num_dependents: 1, num_children_8_to_20: 0 });
      message.success("계산이 완료되었습니다.");
    } catch (err) {
      reportError(err, "계산 요청에 실패했습니다.");
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      employee_name: record.employee_name,
      gross_pay: record.gross_pay,
      num_dependents: record.num_dependents,
      num_children_8_to_20: record.num_children_8_to_20,
    });
  };

  const handleEditSubmit = async (values) => {
    try {
      await salary.updateRecord(editingRecord.id, toSalaryPayload(values));
      setEditingRecord(null);
      message.success("수정되었습니다.");
    } catch (err) {
      reportError(err, "수정에 실패했습니다.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await salary.deleteRecord(id);
      message.success("삭제되었습니다.");
    } catch (err) {
      reportError(err, "삭제에 실패했습니다.");
    }
  };

  const handleChangePassword = async (values) => {
    setChangingPassword(true);
    try {
      await api.put("/auth/password", {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      setPasswordModalOpen(false);
      passwordForm.resetFields();
      message.success("비밀번호가 변경되었습니다.");
    } catch (err) {
      if (err.response?.status === 400) {
        message.error("현재 비밀번호가 올바르지 않습니다.");
      } else {
        reportError(err, "비밀번호 변경에 실패했습니다.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const columns = useMemo(
    () =>
      buildRecordColumns({
        onEdit: openEditModal,
        onDelete: handleDelete,
        onDownloadPayslip: salary.downloadPayslip,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="app">
      <div className="app-header">
        <h1>급여 실수령액 계산기</h1>
        <Space>
          <Button onClick={() => setPasswordModalOpen(true)}>비밀번호 변경</Button>
          <Button onClick={onLogout}>로그아웃</Button>
        </Space>
      </div>

      <CalculateForm form={form} onFinish={handleCalculate} />

      <BulkActions
        uploading={salary.uploading}
        onUpload={salary.uploadBulkCsv}
        exporting={salary.exporting}
        onExport={salary.exportToExcel}
      />

      <RecordFilters
        searchText={salary.searchText}
        onSearchTextChange={salary.setSearchText}
        selectedEmployee={salary.selectedEmployee}
        onSelectedEmployeeChange={salary.updateSelectedEmployee}
        employeeOptions={salary.employeeOptions}
        dateRange={salary.dateRange}
        onDateRangeChange={salary.updateDateRange}
        minGrossPay={salary.minGrossPay}
        onMinGrossPayChange={salary.updateMinGrossPay}
        maxGrossPay={salary.maxGrossPay}
        onMaxGrossPayChange={salary.updateMaxGrossPay}
        onReset={salary.resetFilters}
      />

      <Table
        dataSource={salary.records}
        columns={columns}
        rowKey="id"
        pagination={{
          current: salary.page,
          pageSize: salary.pageSize,
          total: salary.totalRecords,
          onChange: (newPage) => salary.setPage(newPage),
        }}
        scroll={{ x: "max-content" }}
      />

      <h2>세전 급여 vs 실수령액 (현재 페이지)</h2>
      <GrossPayVsNetPayChart data={salary.records} />

      <h2>월별 추이</h2>
      <MonthlyTrendChart data={salary.summary} />

      <SummaryTable
        title="월별 집계"
        dataSource={salary.summary}
        columns={MONTHLY_SUMMARY_COLUMNS}
        rowKey="month"
      />
      <SummaryTable
        title="연도별 집계"
        dataSource={salary.yearlySummary}
        columns={YEARLY_SUMMARY_COLUMNS}
        rowKey="year"
      />
      <SummaryTable
        title="직원별 집계"
        dataSource={salary.employeeSummary}
        columns={EMPLOYEE_SUMMARY_COLUMNS}
        rowKey="employee_name"
      />

      <EditRecordModal
        open={!!editingRecord}
        form={editForm}
        onOk={() => editForm.submit()}
        onCancel={() => setEditingRecord(null)}
        onFinish={handleEditSubmit}
      />

      <ChangePasswordModal
        open={passwordModalOpen}
        form={passwordForm}
        confirmLoading={changingPassword}
        onOk={() => passwordForm.submit()}
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        onFinish={handleChangePassword}
      />
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [theme, setTheme] = useTheme();
  const isDark = theme === "dark";

  const handleLogin = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        // antd 기본 placeholder 색상은 명암 대비가 낮아(라이트 1.8:1, 다크 2.3:1) WCAG AA(4.5:1)에
        // 못 미친다. 두 테마 모두 4.5:1 이상이 되도록 불투명도를 높여 덮어쓴다.
        token: {
          colorTextPlaceholder: isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.55)",
        },
      }}
    >
      <AntApp>
        <Button
          className="theme-toggle"
          shape="circle"
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="테마 전환"
        />
        {token ? <AppContent onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} />}
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
