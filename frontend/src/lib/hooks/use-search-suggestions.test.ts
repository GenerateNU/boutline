import { act, renderHook } from "@testing-library/react";

import { useSearchSuggestions } from "@/lib/hooks/use-search-suggestions";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("useSearchSuggestions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    { name: "a typed term", typed: "nord", want: ["nord match"] },
    { name: "an empty box", typed: "   ", want: null },
  ])("gives suggestions for $name", async ({ typed, want }) => {
    const fetch = jest.fn(async (term: string) => [`${term} match`]);
    const { result } = renderHook(() => useSearchSuggestions(fetch));

    act(() => result.current.change(typed));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.query).toBe(typed);
    expect(result.current.suggestions).toEqual(want);
  });

  it("keeps the newest search when an older one answers last", async () => {
    const slow = deferred<string[]>();
    const fetch = jest.fn((term: string) =>
      term === "a" ? slow.promise : Promise.resolve([`${term} match`]),
    );
    const { result } = renderHook(() => useSearchSuggestions(fetch));

    act(() => result.current.change("a"));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    act(() => result.current.change("ab"));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      slow.resolve(["a match"]);
    });

    expect(result.current.suggestions).toEqual(["ab match"]);
  });

  it("empties the box and the suggestions on clear", async () => {
    const { result } = renderHook(() => useSearchSuggestions(async (term) => [term]));

    act(() => result.current.change("nord"));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    act(() => result.current.clear());

    expect(result.current.query).toBe("");
    expect(result.current.suggestions).toBeNull();
  });
});
