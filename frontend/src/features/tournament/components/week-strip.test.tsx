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
  const track = screen.getByRole("button", { name: "Nov 10" }).parentElement!.parentElement!;
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

  it.each([
    { name: "left two days", dx: -120, want: ["Nov 12", "Nov 13", "Nov 14", "Nov 15", "Nov 16"] },
    { name: "right two days", dx: 120, want: ["Nov 8", "Nov 9", "Nov 10", "Nov 11", "Nov 12"] },
    { name: "less than half a day", dx: -25, want: ["Nov 10", "Nov 11", "Nov 12", "Nov 13", "Nov 14"] },
    { name: "past a full page, capped at one", dx: -500, want: ["Nov 15", "Nov 16", "Nov 17", "Nov 18", "Nov 19"] },
  ])("dragging $name snaps to the nearest day", ({ dx, want }) => {
    const track = renderStrip();

    drag(track, dx);

    expect(visibleDays()).toEqual(want);
  });

  it("selects a day on a tap that barely moves", () => {
    const track = renderStrip();
    const day = screen.getByRole("button", { name: "Nov 12" });

    drag(track, 2);
    fireEvent.click(day);

    expect(replace).toHaveBeenCalledWith(expect.stringContaining("date=2026-11-12"), { scroll: false });
  });

  it("doesn't select the day under the pointer after a drag", () => {
    const track = renderStrip();

    drag(track, -120);
    fireEvent.click(screen.getByRole("button", { name: "Nov 13" }));

    expect(replace).not.toHaveBeenCalled();
  });
});
