import { InputNumber } from "antd";
import { MAX_PAY_AMOUNT } from "../limits";

const formatMoney = (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const parseMoney = (value) => (value ? value.replace(/,/g, "") : "");

// 금액 입력칸: 천 단위 구분(3,000,000)으로 자릿수를 읽기 쉽게 하고, 모바일에서는 숫자 키패드를 띄운다.
function MoneyInput({ max = MAX_PAY_AMOUNT, className, ...props }) {
  return (
    <InputNumber
      min={0}
      max={max}
      formatter={formatMoney}
      parser={parseMoney}
      inputMode="numeric"
      suffix="원"
      className={className ? `money-input ${className}` : "money-input"}
      {...props}
    />
  );
}

export default MoneyInput;
