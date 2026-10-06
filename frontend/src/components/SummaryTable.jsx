import { Table } from "antd";

// 월별/연도별/직원별 집계 표는 구조(페이지네이션 없음, 가로 스크롤)가 동일해 공용화한다.
// 제목은 호출하는 쪽(탭 라벨)이 맡는다.
function SummaryTable({ dataSource, columns, rowKey }) {
  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey={rowKey}
      pagination={false}
      size="small"
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "집계할 이력이 없습니다." }}
    />
  );
}

export default SummaryTable;
