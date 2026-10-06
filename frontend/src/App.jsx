import { lazy, Suspense, useState } from "react";
import { App as AntApp, Button, ConfigProvider, theme as antdTheme } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import koKR from "antd/locale/ko_KR";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import "antd/dist/reset.css";
import "./App.css";
import LoginPage from "./LoginPage";
import { useTheme } from "./hooks/useTheme";

// 로그인 이후 화면(AppContent)은 antd Table/DatePicker/Upload 등 로그인 화면에서는 전혀
// 쓰지 않는 무거운 컴포넌트를 잔뜩 쓴다. 로그인 전 방문자가 이 무게를 미리 받지 않도록
// 로그인에 성공했을 때만 불러온다.
const AppContent = lazy(() => import("./AppContent"));

// 달력 월·요일 이름 등 날짜 표시를 한국어로 맞춘다(antd 문구는 ConfigProvider locale이 처리).
dayjs.locale("ko");

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

  // 로그인 후에는 헤더 안(AppContent)에, 로그인 전과 불러오는 동안에는 화면 우상단에 고정해 보여준다.
  // 고정 버튼을 로그인 후에도 쓰면 좁은 화면에서 제목·버튼과 겹친다.
  const renderThemeToggle = (className) => (
    <Button
      className={className}
      shape="circle"
      icon={isDark ? <SunOutlined /> : <MoonOutlined />}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="테마 전환"
    />
  );

  return (
    <ConfigProvider
      locale={koKR}
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
        {token ? (
          <Suspense
            fallback={
              <>
                {renderThemeToggle("theme-toggle")}
                {APP_CONTENT_FALLBACK}
              </>
            }
          >
            <AppContent onLogout={handleLogout} themeToggle={renderThemeToggle("theme-toggle-inline")} />
          </Suspense>
        ) : (
          <>
            {renderThemeToggle("theme-toggle")}
            <LoginPage onLogin={handleLogin} />
          </>
        )}
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
