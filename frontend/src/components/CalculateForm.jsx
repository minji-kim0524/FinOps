import { Button, Form, Input, InputNumber } from "antd";

function CalculateForm({ form, onFinish }) {
  return (
    <Form
      name="calculate-form"
      className="calculate-form"
      form={form}
      layout="inline"
      onFinish={onFinish}
      initialValues={{ bonus_pay: 0, num_dependents: 1, num_children_8_to_20: 0 }}
    >
      <Form.Item name="employee_name">
        <Input placeholder="직원명" />
      </Form.Item>
      <Form.Item name="gross_pay" rules={[{ required: true, message: "세전 급여를 입력하세요" }]}>
        <InputNumber placeholder="세전 급여" min={0} style={{ width: 160 }} />
      </Form.Item>
      <Form.Item name="bonus_pay">
        <InputNumber placeholder="상여금/성과급" min={0} style={{ width: 160 }} />
      </Form.Item>
      <Form.Item name="num_dependents" rules={[{ required: true, message: "부양가족 수를 입력하세요" }]}>
        <InputNumber placeholder="부양가족 수" min={1} style={{ width: 120 }} />
      </Form.Item>
      <Form.Item name="num_children_8_to_20">
        <InputNumber placeholder="8~20세 자녀 수" min={0} style={{ width: 140 }} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          계산하기
        </Button>
      </Form.Item>
    </Form>
  );
}

export default CalculateForm;
