import { act, renderHook } from "@testing-library/react";

import { useFilterSearch } from "@/lib/hooks/use-filter-search";

function setup() {
  return renderHook(() => useFilterSearch(async (term: string) => [term]));
}

describe("useFilterSearch", () => {
  it.each([
    { name: "pending box text over a committed value", seedValue: "Nord", query: "bos", want: "bos" },
    { name: "the committed value when the box is empty", seedValue: "Nord", query: "", want: "Nord" },
    { name: "undefined when both are empty", seedValue: "", query: "", want: undefined },
  ])("submitValue prefers $name", ({ seedValue, query, want }) => {
    const { result } = setup();

    act(() => result.current.reset(seedValue));
    act(() => result.current.change(query));

    expect(result.current.submitValue()).toBe(want);
  });

  it.each([
    { name: "pick", call: (hook: ReturnType<typeof setup>["result"]["current"]) => hook.pick("Nord") },
    {
      name: "commitText",
      call: (hook: ReturnType<typeof setup>["result"]["current"]) => hook.commitText("bos"),
    },
  ])("$name sets the committed value and clears the box", ({ call, name }) => {
    const { result } = setup();

    act(() => result.current.change("typing..."));
    act(() => call(result.current));

    expect(result.current.value).toBe(name === "pick" ? "Nord" : "bos");
    expect(result.current.query).toBe("");
  });

  it("reset seeds a value when given one, and clears it when given none", () => {
    const { result } = setup();

    act(() => result.current.reset("Nord"));
    expect(result.current.value).toBe("Nord");

    act(() => result.current.reset());
    expect(result.current.value).toBe("");
  });
});
