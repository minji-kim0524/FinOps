import { Form, Input, InputNumber, Modal } from "antd";

function EditRecordModal({ open, form, onOk, onCancel, onFinish }) {
  return (
    <Modal
      title="계산 이력 수정"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="저장"
      cancelText="취소"
    >
      <Form name="edit-form" form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="employee_name" label="직원명">
          <Input />
        </Form.Item>
        <Form.Item
          name="gross_pay"
          label="세전 급여"
          rules={[{ required: true, message: "세전 급여를 입력하세요" }]}
        >
          <InputNumber style={{ width: "100%" }} min={0} />
        </Form.Item>
        <Form.Item
          name="num_dependents"
          label="부양가족 수"
          rules={[{ required: true, message: "부양가족 수를 입력하세요" }]}
        >
          <InputNumber style={{ width: "100%" }} min={1} />
        </Form.Item>
        <Form.Item name="num_children_8_to_20" label="8~20세 자녀 수">
          <InputNumber style={{ width: "100%" }} min={0} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default EditRecordModal;
