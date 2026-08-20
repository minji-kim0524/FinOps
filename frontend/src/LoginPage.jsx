import { useState } from "react";
import { App as AntApp, Button, Card, Form, Input, Segmented } from "antd";
import api from "./api";

const REGISTER_PASSWORD_RULES = [
  { required: true, message: "비밀번호를 입력하세요" },
  { min: 8, message: "비밀번호는 최소 8자 이상이어야 합니다" },
  { pattern: /[A-Za-z]/, message: "비밀번호에 영문자를 포함해야 합니다" },
  { pattern: /\d/, message: "비밀번호에 숫자를 포함해야 합니다" },
];

const LOGIN_PASSWORD_RULES = [{ required: true, message: "비밀번호를 입력하세요" }];

function LoginPage({ onLogin }) {
  const { message } = AntApp.useApp();
  const [mode, setMode] = useState("login");
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const response = await api.post(endpoint, values);
      onLogin(response.data.access_token);
      message.success(mode === "login" ? "로그인되었습니다." : "회원가입 후 로그인되었습니다.");
    } catch (err) {
      if (err.response?.status === 429) {
        message.error("너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.");
      } else {
        message.error(
          mode === "login" ? "아이디 또는 비밀번호가 올바르지 않습니다." : "회원가입에 실패했습니다."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <Card title="급여 실수령액 계산기" style={{ width: 360 }}>
        <Segmented
          block
          options={[
            { label: "로그인", value: "login" },
            { label: "회원가입", value: "register" },
          ]}
          value={mode}
          onChange={setMode}
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="username"
            label="아이디"
            rules={[{ required: true, message: "아이디를 입력하세요" }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="비밀번호"
            extra={mode === "register" ? "최소 8자, 영문자와 숫자를 포함해야 합니다" : undefined}
            rules={mode === "register" ? REGISTER_PASSWORD_RULES : LOGIN_PASSWORD_RULES}
          >
            <Input.Password autoComplete={mode === "register" ? "new-password" : "current-password"} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              {mode === "login" ? "로그인" : "회원가입"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;
