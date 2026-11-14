import { act, fireEvent, render, screen } from "@testing-library/react";

import type { TableauRound } from "../../_types/tableau";
import { TableauBracket } from "./tableau-bracket";

const ROUNDS: TableauRound[] = [
  { id: "8", size: 8, name: "Quarter-finals", boutName: "Quarter-final", bouts: [] },
  { id: "4", size: 4, name: "Semi-finals", boutName: "Semi-final", bouts: [] },
  { id: "2", size: 2, name: "Finals", boutName: "Final", bouts: [] },
];

function setLeft(element: Element, left: number) {
  element.getBoundingClientRect = () => ({ left }) as DOMRect;
}

function setScroll(scroller: HTMLElement, scrollLeft: number) {
  Object.defineProperties(scroller, {
    scrollLeft: { value: scrollLeft, configurable: true },
    clientWidth: { value: 300, configurable: true },
    scrollWidth: { value: 800, configurable: true },
  });
}

function bracket(focusedRoundId: string, onFocusedRoundChange: () => void) {
  return (
    <TableauBracket
      rounds={ROUNDS}
      focusedRoundId={focusedRoundId}
      onFocusedRoundChange={onFocusedRoundChange}
      query=""
      boutBasePath="/bout"
    />
  );
}

function renderBracket(focusedRoundId: string) {
  const onFocusedRoundChange = jest.fn();
  const { container, rerender } = render(bracket(focusedRoundId, onFocusedRoundChange));
  const scroller = container.firstElementChild as HTMLElement;
  setLeft(scroller, 0);
  return { scroller, onFocusedRoundChange, rerender: (id: string) => rerender(bracket(id, onFocusedRoundChange)) };
}

function swipeTo(scroller: HTMLElement, scrollLeft: number, columnLefts: number[]) {
  setScroll(scroller, scrollLeft);
  ROUNDS.forEach((round, index) => setLeft(screen.getByLabelText(round.name), columnLefts[index]));
  fireEvent.scroll(scroller);
  act(() => jest.advanceTimersByTime(150));
}

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("TableauBracket", () => {
  it.each([
    { name: "a round at the left edge", scrollLeft: 256, columnLefts: [-256, 0, 256], want: "4" },
    { name: "the far right, even if the last round can't reach the left edge", scrollLeft: 500, columnLefts: [-500, -244, 12 + 100], want: "2" },
  ])("reports the round snapped to: $name", ({ scrollLeft, columnLefts, want }) => {
    const { scroller, onFocusedRoundChange } = renderBracket("8");

    swipeTo(scroller, scrollLeft, columnLefts);

    expect(onFocusedRoundChange).toHaveBeenCalledWith(want);
  });

  it("reports nothing when the snapped round is already focused", () => {
    const { scroller, onFocusedRoundChange } = renderBracket("8");

    swipeTo(scroller, 0, [0, 256, 512]);

    expect(onFocusedRoundChange).not.toHaveBeenCalled();
  });

  it("does not report a scroll that a round button started, but does report the next swipe", () => {
    const { scroller, onFocusedRoundChange, rerender } = renderBracket("8");
    setScroll(scroller, 0);
    ROUNDS.forEach((round, index) => setLeft(screen.getByLabelText(round.name), index * 256));

    rerender("4");
    swipeTo(scroller, 256, [-256, 0, 256]);
    expect(onFocusedRoundChange).not.toHaveBeenCalled();

    swipeTo(scroller, 0, [0, 256, 512]);
    expect(onFocusedRoundChange).toHaveBeenCalledWith("8");
  });

  it("reports the next swipe after a swipe to the far right already selected the last round", () => {
    const { scroller, onFocusedRoundChange, rerender } = renderBracket("8");
    swipeTo(scroller, 500, [-500, -244, 112]);
    rerender("2");

    swipeTo(scroller, 0, [0, 256, 512]);

    expect(onFocusedRoundChange).toHaveBeenLastCalledWith("8");
  });
});
