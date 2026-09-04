import { Table } from "antd";

// 월별/연도별/직원별 집계 표는 제목만 다르고 구조(페이지네이션 없음, 가로 스크롤)가 동일해 공용화한다.
function SummaryTable({ title, dataSource, columns, rowKey }) {
  return (
    <>
      <h2>{title}</h2>
      <Table
        dataSource={dataSource}
        columns={columns}
        rowKey={rowKey}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
    </>
  );
}

export default SummaryTable;
