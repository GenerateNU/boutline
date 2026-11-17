import { act, fireEvent, render, screen } from "@testing-library/react";

import { CalendarButton } from "@/features/tournament/components/calendar-button";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tournaments",
  useSearchParams: () => new URLSearchParams("date=2026-10-05"),
}));

async function pickOctober9() {
  render(<CalendarButton submitLabel="Show Tournaments" />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
  });
  fireEvent.click(screen.getByRole("button", { name: /October 9/ }));
}

describe("CalendarButton", () => {
  beforeEach(() => replace.mockClear());

  it("applies the picked day on Show Tournaments", async () => {
    await pickOctober9();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Show Tournaments" }));
    });

    expect(replace.mock.calls[0][0]).toContain("date=2026-10-09");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves the filter alone when closed without applying", async () => {
    await pickOctober9();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });

    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the selected day when it's clicked again", async () => {
    render(<CalendarButton submitLabel="Show Tournaments" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    });
    fireEvent.click(screen.getByRole("button", { name: /October 5/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Show Tournaments" }));
    });

    expect(replace.mock.calls[0][0]).toContain("date=2026-10-05");
  });

  it("marks event days with a dot and uses the given submit label", async () => {
    render(<CalendarButton submitLabel="Show Events" eventDays={["2026-10-09"]} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    });

    const marked = screen.getByRole("button", { name: /October 9/ });
    const unmarked = screen.getByRole("button", { name: /October 8/ });
    expect(marked.querySelector("span")).toBeInTheDocument();
    expect(unmarked.querySelector("span")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Events" })).toBeInTheDocument();
  });

  it("inline, opens a card in place and picks a tapped day straight away", async () => {
    render(<CalendarButton inline eventDays={["2026-10-09"]} />);
    const toggle = screen.getByRole("button", { name: "Calendar" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /October 9/ }));
    });

    expect(replace.mock.calls[0][0]).toContain("date=2026-10-09");
    expect(screen.queryByRole("button", { name: /October 9/ })).not.toBeInTheDocument();
  });

  it("inline, closes again when the calendar button is tapped twice", async () => {
    render(<CalendarButton inline />);
    const toggle = screen.getByRole("button", { name: "Calendar" });

    await act(async () => {
      fireEvent.click(toggle);
    });
    await act(async () => {
      fireEvent.click(toggle);
    });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(replace).not.toHaveBeenCalled();
  });
});
