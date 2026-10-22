import { act, renderHook } from "@testing-library/react";

import { useSessionStorage } from "@/lib/hooks/use-session-storage";

describe("useSessionStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns the initial value when nothing is stored", () => {
    const { result } = renderHook(() => useSessionStorage("key", "default"));

    expect(result.current[0]).toBe("default");
  });

  it("returns the parsed stored value after mount", () => {
    sessionStorage.setItem("key", JSON.stringify("stored"));

    const { result } = renderHook(() => useSessionStorage("key", "default"));

    expect(result.current[0]).toBe("stored");
  });

  it("falls back to the initial value when the stored string is corrupt JSON", () => {
    sessionStorage.setItem("key", "not json");

    expect(() => {
      const { result } = renderHook(() => useSessionStorage("key", "default"));
      expect(result.current[0]).toBe("default");
    }).not.toThrow();
  });

  it("updates state and sessionStorage when the setter is called", () => {
    const { result } = renderHook(() => useSessionStorage("key", "default"));

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(sessionStorage.getItem("key")).toBe(JSON.stringify("updated"));
  });
});
