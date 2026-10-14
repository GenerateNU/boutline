import { act, renderHook } from "@testing-library/react";

import type { ScoringAction } from "../_types/scoring-state";

import { useResultConfirmation } from "./use-result-confirmation";

function setup() {
  const queued: ScoringAction[] = [];
  const enqueue = (action: ScoringAction) => queued.push(action);
  const hook = renderHook(
    ({ revision, touchCount }) => useResultConfirmation(revision, touchCount, enqueue),
    { initialProps: { revision: 0, touchCount: 5 } },
  );
  return { queued, ...hook };
}

describe("useResultConfirmation", () => {
  it.each([
    { name: "one confirmation queues nothing", confirms: ["a"], confirmedBy: ["a"], queued: [] },
    {
      name: "both confirmations queue the end with the touch count they saw",
      confirms: ["a", "b"],
      confirmedBy: ["a", "b"],
      queued: [{ kind: "end", touchCount: 5 }],
    },
    { name: "a duplicate confirmation is not counted", confirms: ["a", "a"], confirmedBy: ["a"], queued: [] },
  ])("$name", ({ confirms, confirmedBy, queued }) => {
    const { result, queued: actions } = setup();

    for (const id of confirms) {
      act(() => result.current.confirm(id));
    }

    expect(result.current.confirmedBy).toEqual(confirmedBy);
    expect(actions).toEqual(queued);
  });

  it("a new revision voids earlier confirmations", () => {
    const { result, rerender } = setup();
    act(() => result.current.confirm("a"));

    rerender({ revision: 1, touchCount: 4 });

    expect(result.current.confirmedBy).toEqual([]);
  });

  it("confirming after a revision change starts again from one", () => {
    const { result, rerender, queued } = setup();
    act(() => result.current.confirm("a"));
    rerender({ revision: 1, touchCount: 4 });

    act(() => result.current.confirm("b"));

    expect(result.current.confirmedBy).toEqual(["b"]);
    expect(queued).toEqual([]);
  });
});
