import { useState } from "react";
import { Badge, Button, DatePicker, Input, Select, Typography } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import MoneyInput from "./MoneyInput";

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
  // 좁은 화면에서는 가장 자주 쓰는 검색창만 항상 보이고, 나머지 필터는 "필터" 버튼으로 펼친다
  // (넓은 화면에서는 CSS가 버튼을 숨기고 패널을 항상 보여준다).
  const [panelOpen, setPanelOpen] = useState(false);

  // 최소 급여가 최대 급여보다 크면 항상 결과가 0건이 되는데, 필터 자체는 "정상적으로"
  // 적용된 것이라 화면에 아무 안내 없이 표가 비어 보이면 사용자가 원인을 알기 어렵다.
  const isRangeInverted = minGrossPay != null && maxGrossPay != null && minGrossPay > maxGrossPay;

  // 접힌 패널 안에 적용된 필터가 있어도 버튼 배지로 알려, 결과가 왜 줄었는지 놓치지 않게 한다.
  const hiddenFilterCount = [
    selectedEmployee,
    dateRange?.[0] || dateRange?.[1],
    minGrossPay != null,
    maxGrossPay != null,
  ].filter(Boolean).length;

  return (
    <div className={`record-filters${panelOpen ? " is-open" : ""}`}>
      <div className="record-filters-top">
        <Input.Search
          placeholder="직원명으로 검색"
          allowClear
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          className="record-filters-search"
        />
        <Badge count={hiddenFilterCount} size="small" offset={[-4, 4]}>
          <Button
            className="record-filters-toggle"
            icon={<FilterOutlined />}
            aria-expanded={panelOpen}
            aria-controls="record-filters-panel"
            onClick={() => setPanelOpen((open) => !open)}
          >
            필터
          </Button>
        </Badge>
      </div>

      <div id="record-filters-panel" className="record-filters-panel">
        <Select
          aria-label="직원 선택"
          placeholder="직원 선택"
          allowClear
          showSearch
          value={selectedEmployee}
          onChange={onSelectedEmployeeChange}
          options={employeeOptions}
          className="record-filters-employee"
        />
        <DatePicker.RangePicker
          placeholder={["계산일 시작", "계산일 끝"]}
          value={dateRange}
          onChange={onDateRangeChange}
          className="record-filters-dates"
        />
        <MoneyInput
          placeholder="최소 급여"
          value={minGrossPay}
          onChange={onMinGrossPayChange}
          status={isRangeInverted ? "error" : undefined}
        />
        <MoneyInput
          placeholder="최대 급여"
          value={maxGrossPay}
          onChange={onMaxGrossPayChange}
          status={isRangeInverted ? "error" : undefined}
        />
        <Button onClick={onReset} className="record-filters-reset">
          필터 초기화
        </Button>
      </div>

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
