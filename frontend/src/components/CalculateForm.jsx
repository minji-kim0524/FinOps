import { Button, Form, Input, InputNumber } from "antd";
import { EMPLOYEE_NAME_MAX_LENGTH, MAX_CHILDREN_8_TO_20, MAX_DEPENDENTS } from "../limits";
import MoneyInput from "./MoneyInput";

// 화면이 넓으면 한 줄에 여러 칸, 좁으면 한 칸씩 쌓이는 격자(CSS: .calculate-form)로 배치한다.
// 값이 채워진 뒤에도 무슨 칸인지 알 수 있도록 placeholder에만 의존하지 않고 라벨을 항상 보여준다.
function CalculateForm({ form, onFinish }) {
  return (
    <Form
      name="calculate-form"
      className="calculate-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ bonus_pay: 0, num_dependents: 1, num_children_8_to_20: 0 }}
    >
      <Form.Item name="employee_name" label="직원명" className="field-wide">
        <Input placeholder="직원명" maxLength={EMPLOYEE_NAME_MAX_LENGTH} autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="gross_pay"
        label="세전 급여"
        className="field-wide"
        rules={[{ required: true, message: "세전 급여를 입력하세요" }]}
      >
        <MoneyInput placeholder="세전 급여" />
      </Form.Item>
      <Form.Item name="bonus_pay" label="상여금/성과급" className="field-wide">
        <MoneyInput placeholder="상여금/성과급" />
      </Form.Item>
      <Form.Item
        name="num_dependents"
        label="부양가족 수"
        rules={[{ required: true, message: "부양가족 수를 입력하세요" }]}
      >
        <InputNumber
          placeholder="부양가족 수"
          min={1}
          max={MAX_DEPENDENTS}
          inputMode="numeric"
          suffix="명"
          style={{ width: "100%" }}
        />
      </Form.Item>
      <Form.Item name="num_children_8_to_20" label="8~20세 자녀 수">
        <InputNumber
          placeholder="8~20세 자녀 수"
          min={0}
          max={MAX_CHILDREN_8_TO_20}
          inputMode="numeric"
          suffix="명"
          style={{ width: "100%" }}
        />
      </Form.Item>
      <Form.Item className="calculate-form-submit field-wide">
        <Button type="primary" htmlType="submit" size="large" block>
          계산하기
        </Button>
      </Form.Item>
    </Form>
  );
}

export default CalculateForm;
