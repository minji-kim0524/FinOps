import { useState } from "react";
import { App as AntApp, Button, Card, Form, Input, Modal, Segmented, Select } from "antd";
import api from "./api";

const REGISTER_PASSWORD_RULES = [
  { required: true, message: "비밀번호를 입력하세요" },
  { min: 8, message: "비밀번호는 최소 8자 이상이어야 합니다" },
  { pattern: /[A-Za-z]/, message: "비밀번호에 영문자를 포함해야 합니다" },
  { pattern: /\d/, message: "비밀번호에 숫자를 포함해야 합니다" },
];

const LOGIN_PASSWORD_RULES = [{ required: true, message: "비밀번호를 입력하세요" }];

const SECURITY_QUESTIONS = [
  "가장 좋아하는 음식은 무엇인가요?",
  "출신 초등학교는 어디인가요?",
  "가장 친한 친구의 이름은 무엇인가요?",
  "첫 반려동물의 이름은 무엇인가요?",
];

function LoginPage({ onLogin }) {
  const { message } = AntApp.useApp();
  const [mode, setMode] = useState("login");
  const [submitting, setSubmitting] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetUsername, setResetUsername] = useState("");
  const [resetQuestion, setResetQuestion] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [findForm] = Form.useForm();
  const [resetForm] = Form.useForm();

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

  const closeResetModal = () => {
    setResetOpen(false);
    setResetStep(1);
    setResetUsername("");
    setResetQuestion("");
    findForm.resetFields();
    resetForm.resetFields();
  };

  const handleFindQuestion = async (values) => {
    setResetLoading(true);
    try {
      const response = await api.post("/auth/security-question", { username: values.username });
      setResetUsername(values.username);
      setResetQuestion(response.data.security_question);
      setResetStep(2);
    } catch (err) {
      if (err.response?.status === 429) {
        message.error("너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.");
      } else {
        message.error("존재하지 않는 아이디입니다.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (values) => {
    setResetLoading(true);
    try {
      await api.post("/auth/password-reset", {
        username: resetUsername,
        security_answer: values.security_answer,
        new_password: values.new_password,
      });
      message.success("비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.");
      closeResetModal();
    } catch (err) {
      if (err.response?.status === 429) {
        message.error("너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.");
      } else {
        message.error("보안 답변이 올바르지 않습니다.");
      }
    } finally {
      setResetLoading(false);
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
        <Form name="auth-form" layout="vertical" onFinish={handleFinish}>
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
          {mode === "register" && (
            <>
              <Form.Item
                name="security_question"
                label="보안 질문"
                extra="비밀번호를 잊었을 때 본인 확인에 사용됩니다"
                rules={[{ required: true, message: "보안 질문을 선택하세요" }]}
              >
                <Select options={SECURITY_QUESTIONS.map((q) => ({ label: q, value: q }))} />
              </Form.Item>
              <Form.Item
                name="security_answer"
                label="보안 답변"
                rules={[{ required: true, message: "보안 답변을 입력하세요" }]}
              >
                <Input />
              </Form.Item>
            </>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              {mode === "login" ? "로그인" : "회원가입"}
            </Button>
          </Form.Item>
        </Form>
        {mode === "login" && (
          <Button type="link" style={{ padding: 0 }} onClick={() => setResetOpen(true)}>
            비밀번호를 잊으셨나요?
          </Button>
        )}
      </Card>

      <Modal
        title="비밀번호 재설정"
        open={resetOpen}
        onCancel={closeResetModal}
        footer={null}
        destroyOnClose
      >
        {resetStep === 1 ? (
          <Form form={findForm} layout="vertical" onFinish={handleFindQuestion}>
            <Form.Item
              name="username"
              label="아이디"
              rules={[{ required: true, message: "아이디를 입력하세요" }]}
            >
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={resetLoading}>
                다음
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form form={resetForm} layout="vertical" onFinish={handleResetPassword}>
            <Form.Item label="보안 질문" htmlFor="security-question-readonly">
              <Input id="security-question-readonly" value={resetQuestion} disabled />
            </Form.Item>
            <Form.Item
              name="security_answer"
              label="보안 답변"
              rules={[{ required: true, message: "보안 답변을 입력하세요" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="new_password"
              label="새 비밀번호"
              extra="최소 8자, 영문자와 숫자를 포함해야 합니다"
              rules={REGISTER_PASSWORD_RULES}
            >
              <Input.Password autoComplete="new-password" />
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
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={resetLoading}>
                비밀번호 재설정
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

export default LoginPage;
