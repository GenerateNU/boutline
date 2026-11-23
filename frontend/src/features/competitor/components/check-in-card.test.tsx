import { fireEvent, render, screen } from "@testing-library/react";

import { CheckInCard } from "@/features/competitor/components/check-in-card";
import { setCheckedIn } from "../services/setCheckedIn";
import type { Competitor } from "@/types/competitor";

jest.mock("../services/setCheckedIn", () => ({ setCheckedIn: jest.fn() }));

const mockSetCheckedIn = jest.mocked(setCheckedIn);

const BASE: Competitor = {
  id: "c-1",
  eventId: "e1",
  tournamentId: "t1",
  firstName: "Yan",
  lastName: "Wang",
  rating: "A26",
  ratingYear: 26,
  team: "Boston Blade Club",
  checkedInAt: null,
};

const COMPETITORS: Competitor[] = [
  BASE,
  { ...BASE, id: "c-2", firstName: "Ada", lastName: "Lee", checkedInAt: "2026-11-14T10:00:00Z" },
];

// A one-page source, so these cards never load more.
const SOURCE = { source: { tournamentId: "t1" }, total: 2, pageSize: 25 };

describe("CheckInCard", () => {
  beforeEach(() => mockSetCheckedIn.mockReset());

  it("shows each fencer's state and the checked-in count", () => {
    render(<CheckInCard competitors={COMPETITORS} checkedInTotal={1} {...SOURCE} editable />);

    expect(screen.getByText("1 checked in")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Check in Yan Wang" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("checkbox", { name: "Check in Ada Lee" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it.each([
    { name: "Yan Wang", want: "Absent" },
    { name: "Ada Lee", want: "Present" },
  ])("shows $name as $want without checkboxes when not editable", ({ name, want }) => {
    render(<CheckInCard competitors={COMPETITORS} checkedInTotal={1} {...SOURCE} editable={false} />);

    expect(screen.getByText("1 checked in")).toBeInTheDocument();
    expect(screen.getByText(name).closest("li")).toHaveTextContent(want);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("counts checked-in fencers beyond the loaded page", async () => {
    mockSetCheckedIn.mockResolvedValue({ ...BASE, checkedInAt: "2026-11-14T11:00:00Z" });
    render(<CheckInCard competitors={COMPETITORS} checkedInTotal={30} {...SOURCE} editable />);

    expect(screen.getByText("30 checked in")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Check in Yan Wang" }));
    expect(await screen.findByText("31 checked in")).toBeInTheDocument();
  });

  it("checks a fencer in on click", async () => {
    mockSetCheckedIn.mockResolvedValue({ ...BASE, checkedInAt: "2026-11-14T11:00:00Z" });
    render(<CheckInCard competitors={COMPETITORS} checkedInTotal={1} {...SOURCE} editable />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Check in Yan Wang" }));

    expect(await screen.findByText("2 checked in")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Check in Yan Wang" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it.each([
    { name: "a check-in rejects with an Error", row: "Yan Wang", was: "false", rejection: new Error("Forbidden"), want: "Forbidden" },
    { name: "a check-in rejects with a non-Error", row: "Yan Wang", was: "false", rejection: "nope", want: "Couldn't update check-in" },
    { name: "a check-out rejects", row: "Ada Lee", was: "true", rejection: new Error("Forbidden"), want: "Forbidden" },
  ])("reverts the row and shows the alert when $name", async ({ row, was, rejection, want }) => {
    mockSetCheckedIn.mockRejectedValue(rejection);
    render(<CheckInCard competitors={COMPETITORS} checkedInTotal={1} {...SOURCE} editable />);

    fireEvent.click(screen.getByRole("checkbox", { name: `Check in ${row}` }));

    expect(await screen.findByRole("alert")).toHaveTextContent(want);
    expect(screen.getByText("1 checked in")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: `Check in ${row}` })).toHaveAttribute("aria-checked", was);
  });

  it("drops local toggles when new competitors arrive", async () => {
    mockSetCheckedIn.mockResolvedValue({ ...BASE, checkedInAt: "2026-11-14T11:00:00Z" });
    const { rerender } = render(<CheckInCard competitors={COMPETITORS} checkedInTotal={1} {...SOURCE} editable />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Check in Yan Wang" }));
    expect(await screen.findByText("2 checked in")).toBeInTheDocument();

    rerender(<CheckInCard competitors={[...COMPETITORS]} checkedInTotal={1} {...SOURCE} editable />);

    expect(screen.getByText("1 checked in")).toBeInTheDocument();
  });
});
