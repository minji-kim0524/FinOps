import "@testing-library/jest-dom/vitest";

// jsdom은 matchMedia를 구현하지 않으므로, 다크모드 감지 로직(useTheme)이 쓸 수 있게 최소 구현을 넣는다.
window.matchMedia =
  window.matchMedia ||
  (() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

// jsdom은 ResizeObserver도 구현하지 않는데, antd Table 등이 내부적으로 이를 사용한다.
window.ResizeObserver =
  window.ResizeObserver ||
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
