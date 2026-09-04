import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatWon } from "../utils/format";

function MonthlyTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => (value / 10000).toLocaleString() + "만"} />
        <Tooltip formatter={(value) => formatWon(value)} />
        <Legend />
        <Line type="monotone" dataKey="total_gross_pay" name="총 세전 급여" stroke="#8884d8" />
        <Line type="monotone" dataKey="total_net_pay" name="총 실수령액" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default MonthlyTrendChart;
