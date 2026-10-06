import { useCallback, useSyncExternalStore } from "react";

// 첫 렌더부터 현재 화면 크기를 정확히 반영한다. antd의 Grid.useBreakpoint는 마운트 직후
// 효과가 실행되기 전까지 빈 값을 돌려줘, 데스크톱에서도 한 프레임 동안 모바일 화면이 비치는 문제가 있다.
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

// antd lg 브레이크포인트(992px)와 같은 값. 이보다 좁으면 14열 표 대신 카드 목록으로 보여준다.
export const WIDE_SCREEN_QUERY = "(min-width: 992px)";
export const COMPACT_SCREEN_QUERY = "(max-width: 767px)";
