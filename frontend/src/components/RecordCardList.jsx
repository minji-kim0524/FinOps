import { useState } from "react";
import dayjs from "dayjs";
import { Button, Card, Empty, Pagination, Popconfirm, Select, Spin, Typography } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { COMPACT_SCREEN_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import { formatWon } from "../utils/format";

// 좁은 화면에는 표 머리글의 정렬 버튼이 없으므로, 같은 정렬 조합을 선택 상자로 제공한다.
// value는 "정렬 컬럼:방향" 형식이고, antdOrder는 useRecordFilters.updateSort가 받는 값이다.
const SORT_OPTIONS = [
  { value: "default", label: "등록순", sortBy: null, antdOrder: null },
  { value: "created_at:desc", label: "최근 계산순", sortBy: "created_at", antdOrder: "descend" },
  { value: "created_at:asc", label: "오래된 계산순", sortBy: "created_at", antdOrder: "ascend" },
  { value: "net_pay:desc", label: "실수령액 높은 순", sortBy: "net_pay", antdOrder: "descend" },
  { value: "net_pay:asc", label: "실수령액 낮은 순", sortBy: "net_pay", antdOrder: "ascend" },
  { value: "gross_pay:desc", label: "세전 급여 높은 순", sortBy: "gross_pay", antdOrder: "descend" },
  { value: "employee_name:asc", label: "직원명 가나다순", sortBy: "employee_name", antdOrder: "ascend" },
];

function currentSortValue(sortBy, sortOrder) {
  if (!sortBy) return "default";
  const value = `${sortBy}:${sortOrder}`;
  return SORT_OPTIONS.some((option) => option.value === value) ? value : undefined;
}

const DETAIL_ROWS = [
  ["세전 급여", "gross_pay"],
  ["상여금/성과급", "bonus_pay"],
  ["국민연금", "national_pension"],
  ["건강보험", "health_insurance"],
  ["장기요양보험", "long_term_care"],
  ["고용보험", "employment_insurance"],
  ["소득세", "income_tax"],
  ["지방소득세", "local_income_tax"],
];

function RecordCard({ record, onDownloadPayslip, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = `record-details-${record.id}`;
  const name = record.employee_name || "-";

  return (
    <Card size="small" className="record-card" role="group" aria-label={`${name} 급여 이력`}>
      <div className="record-card-head">
        <div className="record-card-who">
          <Typography.Text strong className="record-card-name">
            {name}
          </Typography.Text>
          <Typography.Text type="secondary" className="record-card-date">
            {dayjs(record.created_at).format("YYYY-MM-DD HH:mm")}
          </Typography.Text>
        </div>
        <div className="record-card-net">
          <Typography.Text type="secondary">실수령액</Typography.Text>
          <strong>{formatWon(record.net_pay)}</strong>
        </div>
      </div>

      <dl className="record-card-summary">
        <div>
          <dt>세전 총 지급액</dt>
          <dd>{formatWon(record.gross_pay + record.bonus_pay)}</dd>
        </div>
        <div>
          <dt>공제액 합계</dt>
          <dd>{formatWon(record.total_deduction)}</dd>
        </div>
      </dl>

      <Button
        type="link"
        size="small"
        className="record-card-toggle"
        icon={expanded ? <UpOutlined /> : <DownOutlined />}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "상세 내역 접기" : "상세 내역 보기"}
      </Button>

      {expanded && (
        <dl id={detailsId} className="record-card-details">
          {DETAIL_ROWS.map(([label, key]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{formatWon(record[key])}</dd>
            </div>
          ))}
          <div>
            <dt>부양가족 수</dt>
            <dd>{record.num_dependents}명</dd>
          </div>
          <div>
            <dt>8~20세 자녀 수</dt>
            <dd>{record.num_children_8_to_20}명</dd>
          </div>
        </dl>
      )}

      <div className="record-card-actions">
        <Button onClick={() => onDownloadPayslip(record.id)}>명세서</Button>
        <Button onClick={() => onEdit(record)}>수정</Button>
        <Popconfirm
          title="이 계산 이력을 삭제하시겠습니까?"
          onConfirm={() => onDelete(record.id)}
          okText="삭제"
          cancelText="취소"
        >
          <Button danger>삭제</Button>
        </Popconfirm>
      </div>
    </Card>
  );
}

function RecordCardList({
  records,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  onDownloadPayslip,
  onEdit,
  onDelete,
  emptyText,
}) {
  // 폭이 아주 좁으면 페이지 번호를 줄줄이 늘어놓지 않고 "현재/전체" 입력 형태로 보여준다.
  const isCompact = useMediaQuery(COMPACT_SCREEN_QUERY);

  const handleSortChange = (value) => {
    const option = SORT_OPTIONS.find((candidate) => candidate.value === value);
    onSortChange(option.sortBy, option.antdOrder);
  };

  return (
    <div className="record-card-list">
      <div className="record-card-toolbar">
        <Select
          aria-label="정렬"
          placeholder="정렬"
          value={currentSortValue(sortBy, sortOrder)}
          onChange={handleSortChange}
          options={SORT_OPTIONS.map(({ value, label }) => ({ value, label }))}
          className="record-card-sort"
        />
      </div>

      <Spin spinning={Boolean(loading)}>
        {records.length === 0 ? (
          <Empty description={emptyText} />
        ) : (
          <div className="record-cards">
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onDownloadPayslip={onDownloadPayslip}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </Spin>

      {total > pageSize && (
        <Pagination
          className="record-card-pagination"
          align="center"
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger={false}
          simple={isCompact}
          onChange={onPageChange}
        />
      )}
    </div>
  );
}

export default RecordCardList;
