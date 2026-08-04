import { useEffect, useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  ConfigProvider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Upload,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
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

function buildColumns({ onEdit, onDelete }) {
  return [
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
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

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

  useEffect(() => {
    fetchRecords();
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
      await fetchRecords();
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
      await fetchRecords();
      message.success(`${response.data.length}건이 일괄 계산되었습니다.`);
    } catch (err) {
      reportError(err, "CSV 일괄 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
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
      await fetchRecords();
      message.success("수정되었습니다.");
    } catch (err) {
      reportError(err, "수정에 실패했습니다.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/records/${id}`);
      await fetchRecords();
      message.success("삭제되었습니다.");
    } catch (err) {
      reportError(err, "삭제에 실패했습니다.");
    }
  };

  const columns = useMemo(
    () => buildColumns({ onEdit: openEditModal, onDelete: handleDelete }),
    []
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) =>
        (record.employee_name || "").toLowerCase().includes(searchText.toLowerCase())
      ),
    [records, searchText]
  );

  return (
    <div className="app">
      <div className="app-header">
        <h1>급여 실수령액 계산기</h1>
        <Button onClick={onLogout}>로그아웃</Button>
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
      </div>

      <Input.Search
        placeholder="직원명으로 검색"
        allowClear
        onChange={(e) => setSearchText(e.target.value)}
        style={{ maxWidth: 300, marginBottom: 16 }}
      />

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
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const handleLogin = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <ConfigProvider>
      <AntApp>
        {token ? <AppContent onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} />}
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
