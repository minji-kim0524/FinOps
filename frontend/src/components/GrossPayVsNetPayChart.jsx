import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatWon } from "../utils/format";

function GrossPayVsNetPayChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="employee_name" />
        <YAxis tickFormatter={(value) => (value / 10000).toLocaleString() + "만"} />
        <Tooltip formatter={(value) => formatWon(value)} />
        <Legend />
        <Bar dataKey={(record) => record.gross_pay + record.bonus_pay} name="세전 급여" fill="#8884d8" />
        <Bar dataKey="net_pay" name="실수령액" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default GrossPayVsNetPayChart;
