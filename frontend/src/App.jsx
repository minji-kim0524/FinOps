import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { App as AntApp, Button, ConfigProvider, Form, Input, InputNumber, Table, Upload } from "antd";
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

const API_BASE_URL = "http://localhost:8000";

function formatWon(value) {
  return value.toLocaleString("ko-KR") + "원";
}

const numericColumn = (title, dataIndex) => ({
  title,
  dataIndex,
  key: dataIndex,
  align: "right",
  sorter: (a, b) => a[dataIndex] - b[dataIndex],
  render: formatWon,
});

const COLUMNS = [
  {
    title: "직원명",
    dataIndex: "employee_name",
    key: "employee_name",
    sorter: (a, b) => a.employee_name.localeCompare(b.employee_name),
    render: (value) => value || "-",
  },
  numericColumn("세전 급여", "gross_pay"),
  {
    title: "부양가족 수",
    dataIndex: "num_dependents",
    key: "num_dependents",
    align: "right",
    sorter: (a, b) => a.num_dependents - b.num_dependents,
    render: (value) => value + "명",
  },
  numericColumn("국민연금", "national_pension"),
  numericColumn("건강보험", "health_insurance"),
  numericColumn("장기요양보험", "long_term_care"),
  numericColumn("고용보험", "employment_insurance"),
  numericColumn("소득세", "income_tax"),
  numericColumn("지방소득세", "local_income_tax"),
  numericColumn("공제액 합계", "total_deduction"),
  numericColumn("실수령액", "net_pay"),
];

function AppContent() {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchRecords = async () => {
    const response = await axios.get(`${API_BASE_URL}/records`);
    setRecords(response.data);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSubmit = async (values) => {
    try {
      await axios.post(`${API_BASE_URL}/calculate`, {
        employee_name: values.employee_name || "",
        gross_pay: values.gross_pay,
        num_dependents: values.num_dependents,
      });
      form.resetFields();
      form.setFieldsValue({ num_dependents: 1 });
      await fetchRecords();
      message.success("계산이 완료되었습니다.");
    } catch (err) {
      message.error("계산 요청에 실패했습니다.");
    }
  };

  const handleBulkUpload = async ({ file }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_BASE_URL}/calculate/bulk`, formData);
      await fetchRecords();
      message.success(`${response.data.length}건이 일괄 계산되었습니다.`);
    } catch (err) {
      message.error("CSV 일괄 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const filteredRecords = useMemo(
    () =>
      records.filter((record) =>
        (record.employee_name || "").toLowerCase().includes(searchText.toLowerCase())
      ),
    [records, searchText]
  );

  return (
    <div className="app">
      <h1>급여 실수령액 계산기</h1>

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
        columns={COLUMNS}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
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
    </div>
  );
}

function App() {
  return (
    <ConfigProvider>
      <AntApp>
        <AppContent />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
