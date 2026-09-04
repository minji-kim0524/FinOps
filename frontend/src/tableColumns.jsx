import dayjs from "dayjs";
import { Button, Popconfirm, Space } from "antd";
import { formatWon } from "./utils/format";

const numericColumn = (title, dataIndex, width = 120) => ({
  title,
  dataIndex,
  key: dataIndex,
  align: "right",
  width,
  sorter: (a, b) => a[dataIndex] - b[dataIndex],
  render: formatWon,
});

export const buildSummaryColumns = (periodTitle, periodKey) => [
  { title: periodTitle, dataIndex: periodKey, key: periodKey },
  { title: "계산 건수", dataIndex: "count", key: "count", align: "right", render: (v) => v + "건" },
  { title: "총 세전 급여", dataIndex: "total_gross_pay", key: "total_gross_pay", align: "right", render: formatWon },
  { title: "총 공제액", dataIndex: "total_deduction", key: "total_deduction", align: "right", render: formatWon },
  { title: "총 실수령액", dataIndex: "total_net_pay", key: "total_net_pay", align: "right", render: formatWon },
  { title: "평균 실수령액", dataIndex: "avg_net_pay", key: "avg_net_pay", align: "right", render: formatWon },
];

export const MONTHLY_SUMMARY_COLUMNS = buildSummaryColumns("월", "month");
export const YEARLY_SUMMARY_COLUMNS = buildSummaryColumns("연도", "year");
export const EMPLOYEE_SUMMARY_COLUMNS = buildSummaryColumns("직원명", "employee_name");

export function buildRecordColumns({ onEdit, onDelete, onDownloadPayslip }) {
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
    {
      title: "8~20세 자녀 수",
      dataIndex: "num_children_8_to_20",
      key: "num_children_8_to_20",
      align: "right",
      width: 130,
      sorter: (a, b) => a.num_children_8_to_20 - b.num_children_8_to_20,
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
      width: 220,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => onDownloadPayslip(record.id)}>
            명세서
          </Button>
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
