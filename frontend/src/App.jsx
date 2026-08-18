import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  App as AntApp,
  Button,
  ConfigProvider,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  theme as antdTheme,
  Upload,
} from "antd";
import { DownloadOutlined, MoonOutlined, SunOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "antd/dist/reset.css";
import "./App.css";
import api from "./api";
import LoginPage from "./LoginPage";

function formatWon(value) {
  return value.toLocaleString("ko-KR") + "원";
}

const numericColumn = (title, dataIndex, width = 120) => ({
  title,
  dataIndex,
  key: dataIndex,
  align: "right",
  width,
  sorter: (a, b) => a[dataIndex] - b[dataIndex],
  render: formatWon,
});

const SUMMARY_COLUMNS = [
  { title: "월", dataIndex: "month", key: "month" },
  { title: "계산 건수", dataIndex: "count", key: "count", align: "right", render: (v) => v + "건" },
  { title: "총 세전 급여", dataIndex: "total_gross_pay", key: "total_gross_pay", align: "right", render: formatWon },
  { title: "총 공제액", dataIndex: "total_deduction", key: "total_deduction", align: "right", render: formatWon },
  { title: "총 실수령액", dataIndex: "total_net_pay", key: "total_net_pay", align: "right", render: formatWon },
  { title: "평균 실수령액", dataIndex: "avg_net_pay", key: "avg_net_pay", align: "right", render: formatWon },
];

function buildColumns({ onEdit, onDelete }) {
  return [
    {
      title: "계산일시",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      sorter: (a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
      render: (value) => dayjs(value).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "직원명",
      dataIndex: "employee_name",
      key: "employee_name",
      width: 120,
      sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
      render: (value) => value || "-",
    },
    numericColumn("세전 급여", "gross_pay", 130),
    {
      title: "부양가족 수",
      dataIndex: "num_dependents",
      key: "num_dependents",
      align: "right",
      width: 120,
      sorter: (a, b) => a.num_dependents - b.num_dependents,
      render: (value) => value + "명",
    },
    numericColumn("국민연금", "national_pension"),
    numericColumn("건강보험", "health_insurance"),
    numericColumn("장기요양보험", "long_term_care", 130),
    numericColumn("고용보험", "employment_insurance"),
    numericColumn("소득세", "income_tax"),
    numericColumn("지방소득세", "local_income_tax", 130),
    numericColumn("공제액 합계", "total_deduction", 140),
    numericColumn("실수령액", "net_pay", 140),
    {
      title: "관리",
      key: "actions",
      fixed: "right",
      width: 150,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => onEdit(record)}>
            수정
          </Button>
          <Popconfirm
            title="이 계산 이력을 삭제하시겠습니까?"
            onConfirm={() => onDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button size="small" danger>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

function AppContent({ onLogout }) {
  const { message, modal } = AntApp.useApp();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [minGrossPay, setMinGrossPay] = useState(null);
  const [maxGrossPay, setMaxGrossPay] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const reportError = (err, fallbackMessage) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      message.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
      onLogout();
    } else {
      message.error(fallbackMessage);
    }
  };

  const fetchRecords = async () => {
    try {
      const response = await api.get("/records");
      setRecords(response.data);
    } catch (err) {
      reportError(err, "계산 이력을 불러오지 못했습니다.");
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get("/records/summary");
      setSummary(response.data);
    } catch (err) {
      reportError(err, "월별 집계를 불러오지 못했습니다.");
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchRecords(), fetchSummary()]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleSubmit = async (values) => {
    try {
      await api.post("/calculate", {
        employee_name: values.employee_name || "",
        gross_pay: values.gross_pay,
        num_dependents: values.num_dependents,
      });
      form.resetFields();
      form.setFieldsValue({ num_dependents: 1 });
      await refreshAll();
      message.success("계산이 완료되었습니다.");
    } catch (err) {
      reportError(err, "계산 요청에 실패했습니다.");
    }
  };

  const handleBulkUpload = async ({ file }) => {
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get("/records/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "salary_records.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      reportError(err, "엑셀 다운로드에 실패했습니다.");
    } finally {
      setExporting(false);
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      employee_name: record.employee_name,
      gross_pay: record.gross_pay,
      num_dependents: record.num_dependents,
    });
  };

  const handleEditSubmit = async (values) => {
    try {
      await api.put(`/records/${editingRecord.id}`, {
        employee_name: values.employee_name || "",
        gross_pay: values.gross_pay,
        num_dependents: values.num_dependents,
      });
      setEditingRecord(null);
      await refreshAll();
      message.success("수정되었습니다.");
    } catch (err) {
      reportError(err, "수정에 실패했습니다.");
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

  const handleDelete = async (id) => {
    try {
      await api.delete(`/records/${id}`);
      await refreshAll();
      message.success("삭제되었습니다.");
    } catch (err) {
      reportError(err, "삭제에 실패했습니다.");
    }
  };

  const columns = useMemo(
    () => buildColumns({ onEdit: openEditModal, onDelete: handleDelete }),
    []
  );

  const resetFilters = () => {
    setSearchText("");
    setDateRange(null);
    setMinGrossPay(null);
    setMaxGrossPay(null);
  };

  const filteredRecords = useMemo(() => {
    const rangeStart = dateRange?.[0]?.startOf("day").valueOf();
    const rangeEnd = dateRange?.[1]?.endOf("day").valueOf();

    return records.filter((record) => {
      const matchesName = (record.employee_name || "")
        .toLowerCase()
        .includes(searchText.toLowerCase());

      const createdAt = dayjs(record.created_at).valueOf();
      const matchesDate =
        (!rangeStart || createdAt >= rangeStart) && (!rangeEnd || createdAt <= rangeEnd);

      const matchesMin = minGrossPay == null || record.gross_pay >= minGrossPay;
      const matchesMax = maxGrossPay == null || record.gross_pay <= maxGrossPay;

      return matchesName && matchesDate && matchesMin && matchesMax;
    });
  }, [records, searchText, dateRange, minGrossPay, maxGrossPay]);

  return (
    <div className="app">
      <div className="app-header">
        <h1>급여 실수령액 계산기</h1>
        <Space>
          <Button onClick={() => setPasswordModalOpen(true)}>비밀번호 변경</Button>
          <Button onClick={onLogout}>로그아웃</Button>
        </Space>
      </div>

      <Form form={form} layout="inline" onFinish={handleSubmit} initialValues={{ num_dependents: 1 }}>
        <Form.Item name="employee_name">
          <Input placeholder="직원명" />
        </Form.Item>
        <Form.Item name="gross_pay" rules={[{ required: true, message: "세전 급여를 입력하세요" }]}>
          <InputNumber placeholder="세전 급여" min={0} style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="num_dependents" rules={[{ required: true, message: "부양가족 수를 입력하세요" }]}>
          <InputNumber placeholder="부양가족 수" min={1} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            계산하기
          </Button>
        </Form.Item>
      </Form>

      <div className="bulk-upload">
        <Upload
          accept=".csv"
          showUploadList={false}
          customRequest={handleBulkUpload}
          disabled={uploading}
        >
          <Button icon={<UploadOutlined />} loading={uploading}>
            CSV 일괄 업로드 (employee_name, gross_pay, num_dependents 컬럼)
          </Button>
        </Upload>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
          엑셀로 내보내기
        </Button>
      </div>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="직원명으로 검색"
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 220 }}
        />
        <DatePicker.RangePicker
          placeholder={["계산일 시작", "계산일 끝"]}
          value={dateRange}
          onChange={(value) => setDateRange(value)}
        />
        <InputNumber
          placeholder="최소 급여"
          min={0}
          value={minGrossPay}
          onChange={setMinGrossPay}
          style={{ width: 140 }}
        />
        <InputNumber
          placeholder="최대 급여"
          min={0}
          value={maxGrossPay}
          onChange={setMaxGrossPay}
          style={{ width: 140 }}
        />
        <Button onClick={resetFilters}>필터 초기화</Button>
      </Space>

      <Table
        dataSource={filteredRecords}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
      />

      <h2>세전 급여 vs 실수령액</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={filteredRecords}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="employee_name" />
          <YAxis tickFormatter={(value) => (value / 10000).toLocaleString() + "만"} />
          <Tooltip formatter={(value) => formatWon(value)} />
          <Legend />
          <Bar dataKey="gross_pay" name="세전 급여" fill="#8884d8" />
          <Bar dataKey="net_pay" name="실수령액" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>

      <h2>월별 집계</h2>
      <Table
        dataSource={summary}
        columns={SUMMARY_COLUMNS}
        rowKey="month"
        pagination={false}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title="계산 이력 수정"
        open={!!editingRecord}
        onCancel={() => setEditingRecord(null)}
        onOk={() => editForm.submit()}
        okText="저장"
        cancelText="취소"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item name="employee_name" label="직원명">
            <Input />
          </Form.Item>
          <Form.Item
            name="gross_pay"
            label="세전 급여"
            rules={[{ required: true, message: "세전 급여를 입력하세요" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item
            name="num_dependents"
            label="부양가족 수"
            rules={[{ required: true, message: "부양가족 수를 입력하세요" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="비밀번호 변경"
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        onOk={() => passwordForm.submit()}
        okText="변경"
        cancelText="취소"
        confirmLoading={changingPassword}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="current_password"
            label="현재 비밀번호"
            rules={[{ required: true, message: "현재 비밀번호를 입력하세요" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="새 비밀번호"
            rules={[{ required: true, message: "새 비밀번호를 입력하세요" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="새 비밀번호 확인"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "새 비밀번호를 다시 입력하세요" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("비밀번호가 일치하지 않습니다"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return [theme, setTheme];
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
      theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}
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
