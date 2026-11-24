import { act, render, screen } from "@testing-library/react";

import { useInfiniteList } from "@/lib/hooks/use-infinite-list";

// jsdom has no IntersectionObserver; this one lets a test say the list's end came into view.
let showListEnd: () => unknown = () => {};
beforeAll(() => {
  global.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) {
      // The hook's callback is async; returning its promise lets the test await the load.
      showListEnd = () =>
        callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never) as unknown;
    }
    observe() {}
    disconnect() {
      showListEnd = () => {};
    }
  } as unknown as typeof IntersectionObserver;
});

const FIRST_PAGE = ["a", "b"];

interface ListProps {
  initial: string[];
  total: number;
  loadPage: (offset: number) => Promise<string[]>;
}

function List({ initial, total, loadPage }: ListProps) {
  const { items, hasMore, error, endRef } = useInfiniteList(initial, total, loadPage);
  return (
    <>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
        {hasMore && <li ref={endRef} aria-hidden />}
      </ul>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

async function reachEnd() {
  await act(async () => {
    await showListEnd();
  });
}

describe("useInfiniteList", () => {
  it.each([
    { name: "loads the next page when the end scrolls into view", total: 3, want: ["a", "b", "c"], wantOffsets: [2] },
    { name: "loads nothing once every item is shown", total: 2, want: ["a", "b"], wantOffsets: [] },
  ])("$name", async ({ total, want, wantOffsets }) => {
    const loadPage = jest.fn().mockResolvedValue(["c"]);
    render(<List initial={FIRST_PAGE} total={total} loadPage={loadPage} />);

    await reachEnd();

    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(want);
    expect(loadPage.mock.calls.map(([offset]) => offset)).toEqual(wantOffsets);
  });

  it("shows the error and stops loading when a page fails", async () => {
    const loadPage = jest.fn().mockRejectedValue(new Error("Network down"));
    render(<List initial={FIRST_PAGE} total={5} loadPage={loadPage} />);

    await reachEnd();
    await reachEnd();

    expect(screen.getByRole("alert")).toHaveTextContent("Network down");
    expect(loadPage).toHaveBeenCalledTimes(1);
  });

  it("drops loaded pages when a new first page arrives", async () => {
    const loadPage = jest.fn().mockResolvedValue(["c"]);
    const { rerender } = render(<List initial={FIRST_PAGE} total={3} loadPage={loadPage} />);
    await reachEnd();

    rerender(<List initial={["x"]} total={1} loadPage={loadPage} />);

    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["x"]);
  });
});
