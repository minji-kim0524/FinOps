import { Button, Card, Typography } from "antd";
import { formatWon } from "../utils/format";
import { DEDUCTION_ROWS } from "../utils/payBreakdown";

// 방금 계산한 결과를 폼 바로 아래에 보여준다. 이력 표는 기본 정렬이 등록순이라 새 이력이 마지막
// 페이지에 들어가므로, 토스트만으로는 계산 결과를 바로 확인하기 어렵다.
function CalculationResult({ ref, result, onViewInHistory, onClose }) {
  const name = result.employee_name || "이름 없음";

  return (
    <Card
      ref={ref}
      size="small"
      className="calculation-result"
      role="status"
      aria-label="계산 결과"
      title="계산 결과"
      extra={
        <Button type="text" size="small" onClick={onClose} aria-label="계산 결과 닫기">
          닫기
        </Button>
      }
    >
      <div className="calculation-result-main">
        <Typography.Text strong className="calculation-result-name">
          {name}
        </Typography.Text>
        <div className="calculation-result-net">
          <Typography.Text type="secondary">실수령액</Typography.Text>
          <strong>{formatWon(result.net_pay)}</strong>
        </div>
      </div>

      <dl className="calculation-result-summary">
        <div>
          <dt>세전 총 지급액</dt>
          <dd>{formatWon(result.gross_pay + result.bonus_pay)}</dd>
        </div>
        <div>
          <dt>공제액 합계</dt>
          <dd>{formatWon(result.total_deduction)}</dd>
        </div>
      </dl>

      <dl className="calculation-result-details">
        {DEDUCTION_ROWS.map(([label, key]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{formatWon(result[key])}</dd>
          </div>
        ))}
      </dl>

      <Button onClick={onViewInHistory}>이력에서 보기</Button>
    </Card>
  );
}

export default CalculationResult;
