import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE_URL = "http://localhost:8000";

const FIELD_LABELS = {
  gross_pay: "세전 급여",
  num_dependents: "부양가족 수",
  national_pension: "국민연금",
  health_insurance: "건강보험",
  long_term_care: "장기요양보험",
  employment_insurance: "고용보험",
  income_tax: "소득세",
  local_income_tax: "지방소득세",
  total_deduction: "공제액 합계",
  net_pay: "실수령액",
};

function formatValue(field, value) {
  if (field === "num_dependents") {
    return value + "명";
  }
  return value.toLocaleString("ko-KR") + "원";
}

function App() {
  const [grossPay, setGrossPay] = useState("");
  const [numDependents, setNumDependents] = useState("1");
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);

  const fetchRecords = async () => {
    const response = await axios.get(`${API_BASE_URL}/records`);
    setRecords(response.data);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/calculate`, {
        gross_pay: Number(grossPay),
        num_dependents: Number(numDependents),
      });
      setGrossPay("");
      setNumDependents("1");
      await fetchRecords();
    } catch (err) {
      setError("계산 요청에 실패했습니다.");
    }
  };

  return (
    <div className="app">
      <h1>급여 실수령액 계산기</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={grossPay}
          onChange={(e) => setGrossPay(e.target.value)}
          placeholder="세전 급여를 입력하세요"
          required
        />
        <input
          type="number"
          min="1"
          value={numDependents}
          onChange={(e) => setNumDependents(e.target.value)}
          placeholder="부양가족 수"
          required
        />
        <button type="submit">계산하기</button>
      </form>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            {Object.values(FIELD_LABELS).map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              {Object.keys(FIELD_LABELS).map((field) => (
                <td key={field}>{formatValue(field, record[field])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
