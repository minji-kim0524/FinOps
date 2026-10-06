import { lazy, Suspense, useMemo, useState } from "react";
import { App as AntApp, Button, Card, Form, Space, Table, Tabs, Typography } from "antd";
import api from "./api";
import { useErrorReporter } from "./hooks/useErrorReporter";
import { useSalaryRecords } from "./hooks/useSalaryRecords";
import { COMPACT_SCREEN_QUERY, WIDE_SCREEN_QUERY, useMediaQuery } from "./hooks/useMediaQuery";
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
import SummaryTable from "./components/SummaryTable";
import RecordCardList from "./components/RecordCardList";

// recharts는 vendor 청크 하나만으로도 용량이 커서(gzip 약 110KB), 화면 하단에 있는 차트
// 두 개에서만 쓰는 이 라이브러리를 초기 번들에서 분리해 필요할 때만 불러온다.
const GrossPayVsNetPayChart = lazy(() => import("./components/GrossPayVsNetPayChart"));
const MonthlyTrendChart = lazy(() => import("./components/MonthlyTrendChart"));

const chartFallback = (compact) => <div style={{ height: compact ? 260 : 320 }} />;

function toSalaryPayload(values) {
  return {
    employee_name: values.employee_name || "",
    gross_pay: values.gross_pay,
    bonus_pay: values.bonus_pay || 0,
    num_dependents: values.num_dependents,
    num_children_8_to_20: values.num_children_8_to_20 || 0,
  };
}

// 로그인 이후 화면(이력 표·필터·집계·차트 등 antd Table/DatePicker/Upload를 쓰는 대부분의
// 화면)을 이 파일로 분리해, App.jsx에서 지연 로딩(React.lazy)한다. 로그인 전 화면(LoginPage)은
// 이 컴포넌트들을 전혀 쓰지 않는데도 같은 번들에 묶여 있으면 로그인 화면조차 이 무게를 그대로
// 떠안기 때문이다.
function AppContent({ onLogout, themeToggle }) {
  const { message, modal } = AntApp.useApp();
  const reportError = useErrorReporter({ message, onLogout });
  const salary = useSalaryRecords({ message, modal, onLogout });

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [editingRecord, setEditingRecord] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // 넓은 화면(lg 이상)은 14열 표, 그보다 좁으면 핵심 금액만 먼저 보이는 카드 목록으로 보여준다.
  const isWideScreen = useMediaQuery(WIDE_SCREEN_QUERY);
  const isCompactScreen = useMediaQuery(COMPACT_SCREEN_QUERY);

  const handleCalculate = async (values) => {
    try {
      await salary.submitCalculation(toSalaryPayload(values));
      form.resetFields();
      form.setFieldsValue({ bonus_pay: 0, num_dependents: 1, num_children_8_to_20: 0 });
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
      bonus_pay: record.bonus_pay,
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

  const hasActiveFilters = Boolean(
    salary.searchText ||
      salary.selectedEmployee ||
      salary.dateRange?.[0] ||
      salary.dateRange?.[1] ||
      salary.minGrossPay != null ||
      salary.maxGrossPay != null
  );
  const emptyText = hasActiveFilters
    ? "조건에 맞는 계산 이력이 없습니다. 필터를 조정해보세요."
    : "아직 계산 이력이 없습니다. 위에서 급여를 계산해보세요.";

  const summaryTabs = [
    { key: "monthly", label: "월별", dataSource: salary.summary, columns: MONTHLY_SUMMARY_COLUMNS, rowKey: "month" },
    {
      key: "yearly",
      label: "연도별",
      dataSource: salary.yearlySummary,
      columns: YEARLY_SUMMARY_COLUMNS,
      rowKey: "year",
    },
    {
      key: "employee",
      label: "직원별",
      dataSource: salary.employeeSummary,
      columns: EMPLOYEE_SUMMARY_COLUMNS,
      rowKey: "employee_name",
    },
  ].map(({ key, label, ...tableProps }) => ({
    key,
    label,
    children: <SummaryTable {...tableProps} />,
  }));

  return (
    <div className="app">
      <header className="app-header">
        <h1>급여 실수령액 계산기</h1>
        <Space wrap>
          {themeToggle}
          <Button onClick={() => setPasswordModalOpen(true)}>비밀번호 변경</Button>
          <Button onClick={onLogout}>로그아웃</Button>
        </Space>
      </header>

      <Card title="급여 계산" className="app-section">
        <CalculateForm form={form} onFinish={handleCalculate} />
      </Card>

      <Card title="일괄 작업" className="app-section">
        <BulkActions
          uploading={salary.uploading}
          onUpload={salary.uploadBulkCsv}
          exporting={salary.exporting}
          onExport={salary.exportToExcel}
          onDownloadTemplate={salary.downloadCsvTemplate}
          downloadingPayslips={salary.downloadingPayslips}
          onDownloadPayslipsZip={salary.downloadPayslipsZip}
          filteredRecordCount={salary.totalRecords}
          message={message}
        />
      </Card>

      <Card
        title={
          <>
            계산 이력{" "}
            <Typography.Text type="secondary" className="app-section-count">
              {salary.totalRecords.toLocaleString("ko-KR")}건
            </Typography.Text>
          </>
        }
        className="app-section"
      >
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

        {isWideScreen ? (
          <Table
            dataSource={salary.records}
            columns={columns}
            rowKey="id"
            loading={salary.loadingRecords}
            locale={{ emptyText }}
            pagination={{
              current: salary.page,
              pageSize: salary.pageSize,
              total: salary.totalRecords,
              showSizeChanger: false,
            }}
            onChange={(pagination, _filters, sorter) => {
              salary.setPage(pagination.current);
              salary.updateSort(sorter.field, sorter.order);
            }}
            scroll={{ x: "max-content" }}
          />
        ) : (
          <RecordCardList
            records={salary.records}
            loading={salary.loadingRecords}
            page={salary.page}
            pageSize={salary.pageSize}
            total={salary.totalRecords}
            onPageChange={salary.setPage}
            sortBy={salary.sortBy}
            sortOrder={salary.sortOrder}
            onSortChange={salary.updateSort}
            onDownloadPayslip={salary.downloadPayslip}
            onEdit={openEditModal}
            onDelete={handleDelete}
            emptyText={emptyText}
          />
        )}
      </Card>

      <Card title="급여 분석" className="app-section">
        <div className="chart-grid">
          <section>
            <h3>세전 급여 vs 실수령액 (현재 페이지)</h3>
            <Suspense fallback={chartFallback(isCompactScreen)}>
              <GrossPayVsNetPayChart data={salary.records} compact={isCompactScreen} />
            </Suspense>
          </section>
          <section>
            <h3>월별 추이</h3>
            <Suspense fallback={chartFallback(isCompactScreen)}>
              <MonthlyTrendChart data={salary.summary} compact={isCompactScreen} />
            </Suspense>
          </section>
        </div>
      </Card>

      <Card title="집계" className="app-section">
        <Tabs items={summaryTabs} />
      </Card>

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

export default AppContent;
