// API 요청 실패를 사용자에게 알리는 공용 로직.
// 인증 만료(401/403)는 어디서 발생하든 동일하게 로그아웃 처리해야 하므로 한 곳에 모아둔다.
export function useErrorReporter({ message, onLogout }) {
  return (err, fallbackMessage) => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      message.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
      onLogout();
    } else {
      message.error(fallbackMessage);
    }
  };
}
