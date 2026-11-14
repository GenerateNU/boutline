import { act, fireEvent, render, screen } from "@testing-library/react";

import { CalendarButton } from "@/features/tournament/components/calendar-button";

const replace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tournaments",
  useSearchParams: () => new URLSearchParams("date=2026-10-05"),
}));

async function pickOctober9() {
  render(<CalendarButton />);
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
});
