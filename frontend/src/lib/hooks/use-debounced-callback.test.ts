import { renderHook } from "@testing-library/react";

import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls the callback once after the delay, with the latest args", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    const [debounced] = result.current;
    debounced("a");
    debounced("b");

    jest.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("b");
  });

  it("does not call the callback when cancelled before the delay elapses", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    const [debounced, cancel] = result.current;
    debounced("a");
    cancel();

    jest.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call the callback after the component unmounts", () => {
    const callback = jest.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback, 300),
    );

    const [debounced] = result.current;
    debounced("a");
    unmount();

    jest.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();
  });
});
