import { fireEvent, render, screen, within } from "@testing-library/react";

import type { ResultFencer } from "../../_types/results";
import { ResultFencerCard } from "./result-fencer-card";

const base: ResultFencer = {
  id: "1",
  firstName: "Maya",
  lastName: "Chen",
  club: "Boston Blade",
  rating: "A26",
  place: 1,
  pool: 4,
  strip: "12",
  status: "advanced",
};

function openCard(fencer: ResultFencer) {
  render(<ResultFencerCard fencer={fencer} eventName="Senior Epee" eventStatus="active" />);
  fireEvent.click(screen.getByRole("button", { name: /maya chen/i }));
  return within(screen.getByRole("dialog", { name: /maya chen/i }));
}

describe("ResultFencerCard", () => {
  it.each([
    { name: "a strip", strip: "12", shown: "12" },
    { name: "no strip", strip: null, shown: "—" },
  ])("opens a popup with pool and $name", ({ strip, shown }) => {
    const dialog = openCard({ ...base, strip });

    expect(dialog.getByText("Boston Blade")).toBeInTheDocument();
    expect(dialog.getByText("Pool").nextElementSibling).toHaveTextContent("4");
    expect(dialog.getByText("Strip").nextElementSibling).toHaveTextContent(shown);
  });

  it("shows the event name with its status and no fencer link", () => {
    const dialog = openCard(base);

    expect(dialog.getByText("Senior Epee")).toBeInTheDocument();
    expect(dialog.getByText("In Progress")).toBeInTheDocument();
    expect(dialog.queryByRole("link")).not.toBeInTheDocument();
  });

  it("closes from the close button", () => {
    const dialog = openCard(base);

    fireEvent.click(dialog.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
