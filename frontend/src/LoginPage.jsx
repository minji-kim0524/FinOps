import { useState } from "react";
import { App as AntApp, Button, Card, Form, Input, Segmented } from "antd";
import api from "./api";

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
      message.error(
        mode === "login" ? "아이디 또는 비밀번호가 올바르지 않습니다." : "회원가입에 실패했습니다."
      );
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
            rules={[{ required: true, message: "비밀번호를 입력하세요" }]}
          >
            <Input.Password autoComplete="current-password" />
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
