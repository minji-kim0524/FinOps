import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

const originalMatchMedia = window.matchMedia;

function mockMatchMedia(initialMatches) {
  const listeners = new Set();
  const state = { matches: initialMatches };

  window.matchMedia = vi.fn(() => ({
    get matches() {
      return state.matches;
    },
    addEventListener: (_event, listener) => listeners.add(listener),
    removeEventListener: (_event, listener) => listeners.delete(listener),
  }));

  return {
    setMatches(next) {
      state.matches = next;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}

describe("useMediaQuery", () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("첫 렌더부터 현재 화면 조건의 일치 여부를 돌려준다", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery("(min-width: 992px)"));

    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 992px)");
  });

  it("화면 크기가 바뀌면 값이 갱신된다", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 992px)"));
    expect(result.current).toBe(false);

    act(() => media.setMatches(true));

    expect(result.current).toBe(true);
  });

  it("언마운트하면 리스너를 해제한다", () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 992px)"));
    expect(media.listenerCount()).toBe(1);

    unmount();

    expect(media.listenerCount()).toBe(0);
  });
});
