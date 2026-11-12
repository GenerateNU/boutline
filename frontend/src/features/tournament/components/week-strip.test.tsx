import { fireEvent, render, screen } from "@testing-library/react";

import { WeekStrip } from "@/features/tournament/components/week-strip";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tournaments",
  useSearchParams: () => new URLSearchParams("date=2026-11-11"),
}));

// Five days fill 300px, so each day is 60px wide.
const trackWidth = 300;

function renderStrip() {
  render(<WeekStrip />);
  const track = screen.getByRole("button", { name: "Nov 11" }).parentElement!.parentElement!;
  Object.defineProperty(track, "clientWidth", { value: trackWidth });
  return track;
}

function visibleDays() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.hasAttribute("aria-pressed"))
    .map((button) => button.textContent);
}

function drag(track: HTMLElement, dx: number) {
  fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: 150 });
  fireEvent.pointerMove(track, { pointerId: 1, clientX: 150 + dx });
  fireEvent.pointerUp(track, { pointerId: 1, clientX: 150 + dx });
}

describe("WeekStrip", () => {
  beforeAll(() => {
    // jsdom has no PointerEvent, so fireEvent would drop clientX and pointerId.
    class TestPointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    }
    window.PointerEvent = TestPointerEvent as typeof PointerEvent;
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    Element.prototype.animate = jest.fn();
    Element.prototype.setPointerCapture = jest.fn();
  });

  beforeEach(() => {
    replace.mockClear();
  });

  const current = ["Nov 11", "Nov 12", "Nov 13", "Nov 14", "Nov 15"];
  const next = ["Nov 16", "Nov 17", "Nov 18", "Nov 19", "Nov 20"];
  const previous = ["Nov 6", "Nov 7", "Nov 8", "Nov 9", "Nov 10"];

  it("opens with the selected day leftmost", () => {
    renderStrip();

    expect(visibleDays()).toEqual(current);
  });

  // A page turns once a drag passes a quarter of the 300px strip (75px).
  it.each([
    { name: "left past a quarter", dx: -120, want: next, date: "2026-11-16" },
    { name: "right past a quarter", dx: 120, want: previous, date: "2026-11-06" },
    { name: "left under a quarter", dx: -60, want: current, date: undefined },
    { name: "right under a quarter", dx: 60, want: current, date: undefined },
    { name: "left past a full page", dx: -500, want: next, date: "2026-11-16" },
  ])("dragging $name locks to a five-day page", ({ dx, want, date }) => {
    const track = renderStrip();

    drag(track, dx);

    expect(visibleDays()).toEqual(want);
    if (date) {
      expect(replace).toHaveBeenCalledWith(expect.stringContaining(`date=${date}`), { scroll: false });
    } else {
      expect(replace).not.toHaveBeenCalled();
    }
  });

  it.each([
    { button: "Later days", want: next, date: "2026-11-16" },
    { button: "Earlier days", want: previous, date: "2026-11-06" },
  ])("$button turns the page and selects its first day", ({ button, want, date }) => {
    renderStrip();

    fireEvent.click(screen.getByRole("button", { name: button }));

    expect(visibleDays()).toEqual(want);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining(`date=${date}`), { scroll: false });
  });

  it("selects a tapped day without moving the strip", () => {
    const track = renderStrip();
    const day = screen.getByRole("button", { name: "Nov 13" });

    drag(track, 2);
    fireEvent.click(day);

    expect(replace).toHaveBeenCalledWith(expect.stringContaining("date=2026-11-13"), { scroll: false });
    expect(visibleDays()).toEqual(current);
  });

  it("doesn't select the day under the pointer after a drag", () => {
    const track = renderStrip();

    drag(track, -120);
    fireEvent.click(screen.getByRole("button", { name: "Nov 18" }));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("date=2026-11-16"), { scroll: false });
  });
});
