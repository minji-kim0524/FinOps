import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatWon } from "../utils/format";

// compact(좁은 화면)에서는 높이와 축 여백을 줄이고, 직원명이 겹치지 않도록 기울여 모두 표시한다.
function GrossPayVsNetPayChart({ data, compact = false }) {
  return (
    <ResponsiveContainer width="100%" height={compact ? 260 : 320}>
      <BarChart data={data} margin={compact ? { top: 8, right: 8, left: 0, bottom: 0 } : undefined}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="employee_name"
          tick={{ fontSize: compact ? 11 : 12 }}
          interval={compact ? 0 : "preserveEnd"}
          angle={compact ? -40 : 0}
          textAnchor={compact ? "end" : "middle"}
          height={compact ? 56 : 30}
        />
        <YAxis
          width={compact ? 66 : 70}
          tick={{ fontSize: compact ? 11 : 12 }}
          tickFormatter={(value) => (value / 10000).toLocaleString() + "만"}
        />
        <Tooltip formatter={(value) => formatWon(value)} />
        <Legend />
        <Bar dataKey={(record) => record.gross_pay + record.bonus_pay} name="세전 급여" fill="#8884d8" />
        <Bar dataKey="net_pay" name="실수령액" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default GrossPayVsNetPayChart;
