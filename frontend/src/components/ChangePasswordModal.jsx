import { Form, Input, Modal } from "antd";

const NEW_PASSWORD_RULES = [
  { required: true, message: "새 비밀번호를 입력하세요" },
  { min: 8, message: "비밀번호는 최소 8자 이상이어야 합니다" },
  { pattern: /[A-Za-z]/, message: "비밀번호에 영문자를 포함해야 합니다" },
  { pattern: /\d/, message: "비밀번호에 숫자를 포함해야 합니다" },
];

function ChangePasswordModal({ open, form, confirmLoading, onOk, onCancel, onFinish }) {
  return (
    <Modal
      title="비밀번호 변경"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      okText="변경"
      cancelText="취소"
      confirmLoading={confirmLoading}
    >
      <Form name="password-form" form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="current_password"
          label="현재 비밀번호"
          rules={[{ required: true, message: "현재 비밀번호를 입력하세요" }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="new_password"
          label="새 비밀번호"
          extra="최소 8자, 영문자와 숫자를 포함해야 합니다"
          rules={NEW_PASSWORD_RULES}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirm_password"
          label="새 비밀번호 확인"
          dependencies={["new_password"]}
          rules={[
            { required: true, message: "새 비밀번호를 다시 입력하세요" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("new_password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("비밀번호가 일치하지 않습니다"));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default ChangePasswordModal;
