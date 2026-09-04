import { Button, DatePicker, Input, InputNumber, Select, Space } from "antd";

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
  return (
    <Space wrap style={{ marginBottom: 16 }}>
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
        style={{ width: 140 }}
      />
      <InputNumber
        placeholder="최대 급여"
        min={0}
        value={maxGrossPay}
        onChange={onMaxGrossPayChange}
        style={{ width: 140 }}
      />
      <Button onClick={onReset}>필터 초기화</Button>
    </Space>
  );
}

export default RecordFilters;
