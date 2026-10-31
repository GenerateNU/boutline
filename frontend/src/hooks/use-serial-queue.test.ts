import { act, renderHook } from "@testing-library/react";

import { useSerialQueue } from "./use-serial-queue";

// Each send waits until the test resolves or rejects it, so the test controls the order requests finish in.
function setup({ failureThrows = false } = {}) {
  const sent: string[] = [];
  const failures: unknown[] = [];
  const inFlight: { item: string; resolve: () => void; reject: (reason: Error) => void }[] = [];
  let concurrent = 0;
  let maxConcurrent = 0;

  async function send(item: string) {
    concurrent += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    try {
      await new Promise<void>((resolve, reject) => inFlight.push({ item, resolve, reject }));
      sent.push(item);
    } finally {
      concurrent -= 1;
    }
  }

  async function onFailure(caught: unknown) {
    failures.push(caught);
    if (failureThrows) {
      throw new Error("recovery failed");
    }
  }

  const hook = renderHook(() => useSerialQueue({ send, onFailure }));

  async function finishNext(outcome: "resolve" | "reject" = "resolve") {
    await act(async () => {
      const request = inFlight.shift();
      if (outcome === "resolve") {
        request?.resolve();
      } else {
        request?.reject(new Error(`${request.item} failed`));
      }
    });
  }

  return {
    ...hook,
    sent,
    failures,
    finishNext,
    inFlight: () => inFlight.map((request) => request.item),
    maxConcurrent: () => maxConcurrent,
  };
}

describe("useSerialQueue", () => {
  it("sends items one at a time, in the order they were queued", async () => {
    const { result, sent, finishNext, maxConcurrent } = setup();

    act(() => {
      result.current.enqueue("a");
      result.current.enqueue("b");
      result.current.enqueue("c");
    });
    expect(result.current.pending).toEqual(["a", "b", "c"]);

    await finishNext();
    expect(result.current.pending).toEqual(["b", "c"]);
    await finishNext();
    await finishNext();

    expect(sent).toEqual(["a", "b", "c"]);
    expect(result.current.pending).toEqual([]);
    expect(maxConcurrent()).toBe(1);
  });

  it("drops the items queued behind a failure and reports it", async () => {
    const { result, sent, failures, finishNext, inFlight } = setup();

    act(() => {
      result.current.enqueue("a");
      result.current.enqueue("b");
    });
    await finishNext("reject");

    expect(failures).toEqual([new Error("a failed")]);
    expect(result.current.pending).toEqual([]);
    expect(inFlight()).toEqual([]);
    expect(sent).toEqual([]);
  });

  it.each([
    { name: "a failure", failureThrows: false },
    { name: "a failure whose recovery throws", failureThrows: true },
  ])("keeps sending items queued after $name", async ({ failureThrows }) => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    const { result, sent, finishNext } = setup({ failureThrows });

    act(() => result.current.enqueue("a"));
    await finishNext("reject");
    act(() => result.current.enqueue("b"));
    await finishNext();

    expect(sent).toEqual(["b"]);
    expect(result.current.pending).toEqual([]);
    expect(logged).toHaveBeenCalledTimes(failureThrows ? 1 : 0);
    logged.mockRestore();
  });
});
