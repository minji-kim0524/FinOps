import { Button, DatePicker, Input, InputNumber, Select, Space, Typography } from "antd";

function RecordFilters({
  searchText,
  onSearchTextChange,
  selectedEmployee,
  onSelectedEmployeeChange,
  employeeOptions,
  dateRange,
  onDateRangeChange,
  minGrossPay,
  onMinGrossPayChange,
  maxGrossPay,
  onMaxGrossPayChange,
  onReset,
}) {
  // 최소 급여가 최대 급여보다 크면 항상 결과가 0건이 되는데, 필터 자체는 "정상적으로"
  // 적용된 것이라 화면에 아무 안내 없이 표가 비어 보이면 사용자가 원인을 알기 어렵다.
  const isRangeInverted = minGrossPay != null && maxGrossPay != null && minGrossPay > maxGrossPay;

  return (
    <div style={{ marginBottom: 16 }}>
      <Space wrap>
        <Input.Search
          placeholder="직원명으로 검색"
          allowClear
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          style={{ width: 220 }}
        />
        <Select
          aria-label="직원 선택"
          placeholder="직원 선택"
          allowClear
          showSearch
          value={selectedEmployee}
          onChange={onSelectedEmployeeChange}
          options={employeeOptions}
          style={{ width: 160 }}
        />
        <DatePicker.RangePicker
          placeholder={["계산일 시작", "계산일 끝"]}
          value={dateRange}
          onChange={onDateRangeChange}
        />
        <InputNumber
          placeholder="최소 급여"
          min={0}
          value={minGrossPay}
          onChange={onMinGrossPayChange}
          status={isRangeInverted ? "error" : undefined}
          style={{ width: 140 }}
        />
        <InputNumber
          placeholder="최대 급여"
          min={0}
          value={maxGrossPay}
          onChange={onMaxGrossPayChange}
          status={isRangeInverted ? "error" : undefined}
          style={{ width: 140 }}
        />
        <Button onClick={onReset}>필터 초기화</Button>
      </Space>
      {isRangeInverted && (
        <div>
          <Typography.Text type="danger">
            최소 급여가 최대 급여보다 커서 조회 결과가 없습니다. 값을 확인해주세요.
          </Typography.Text>
        </div>
      )}
    </div>
  );
}

export default RecordFilters;
