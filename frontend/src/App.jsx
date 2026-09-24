import { lazy, Suspense, useState } from "react";
import { App as AntApp, Button, ConfigProvider, theme as antdTheme } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import "antd/dist/reset.css";
import "./App.css";
import LoginPage from "./LoginPage";
import { useTheme } from "./hooks/useTheme";

// 로그인 이후 화면(AppContent)은 antd Table/DatePicker/Upload 등 로그인 화면에서는 전혀
// 쓰지 않는 무거운 컴포넌트를 잔뜩 쓴다. 로그인 전 방문자가 이 무게를 미리 받지 않도록
// 로그인에 성공했을 때만 불러온다.
const AppContent = lazy(() => import("./AppContent"));

const APP_CONTENT_FALLBACK = <div style={{ padding: 40, textAlign: "center" }}>불러오는 중...</div>;

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [theme, setTheme] = useTheme();
  const isDark = theme === "dark";

  const handleLogin = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        // antd 기본 placeholder 색상은 명암 대비가 낮아(라이트 1.8:1, 다크 2.3:1) WCAG AA(4.5:1)에
        // 못 미친다. 두 테마 모두 4.5:1 이상이 되도록 불투명도를 높여 덮어쓴다.
        token: {
          colorTextPlaceholder: isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.55)",
        },
      }}
    >
      <AntApp>
        <Button
          className="theme-toggle"
          shape="circle"
          icon={isDark ? <SunOutlined /> : <MoonOutlined />}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="테마 전환"
        />
        {token ? (
          <Suspense fallback={APP_CONTENT_FALLBACK}>
            <AppContent onLogout={handleLogout} />
          </Suspense>
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
