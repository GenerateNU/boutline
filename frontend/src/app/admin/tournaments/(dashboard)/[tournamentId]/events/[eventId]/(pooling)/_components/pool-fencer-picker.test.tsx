import { fireEvent, render, screen } from "@testing-library/react";

import { listEventCompetitors } from "@/features/competitor/services/listEventCompetitors";
import type { Competitor } from "@/types/competitor";

import { PoolFencerPicker } from "./pool-fencer-picker";

jest.mock("../../../../../../../../../features/competitor/services/listEventCompetitors", () => ({
  listEventCompetitors: jest.fn(),
}));

function competitor(id: string, firstName: string, checkedInAt: string | null): Competitor {
  return { id, eventId: "e1", firstName, lastName: "Smith", rating: "A", ratingYear: 26, team: "Club X", checkedInAt };
}

const COMPETITORS = [
  competitor("c1", "Ann", "2026-01-01"),
  competitor("c2", "Bob", null),
  competitor("c3", "Cy", "2026-01-01"),
  competitor("c4", "Di", "2026-01-01"),
];

function setup(selected = [{ id: "c4", name: "Di Smith" }]) {
  jest.mocked(listEventCompetitors).mockResolvedValue(COMPETITORS);
  const onConfirm = jest.fn();
  render(
    <PoolFencerPicker
      open
      onOpenChange={jest.fn()}
      tournamentId="t1"
      eventId="e1"
      excludedIds={["c3"]}
      selected={selected}
      onConfirm={onConfirm}
    />,
  );
  return onConfirm;
}

describe("PoolFencerPicker", () => {
  it("lists only checked-in fencers that are not excluded, with rating and club", async () => {
    setup();

    expect(await screen.findByText("Ann Smith")).toBeInTheDocument();
    expect(screen.getByText("Di Smith")).toBeInTheDocument();
    expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
    expect(screen.queryByText("Cy Smith")).not.toBeInTheDocument();
    expect(screen.getAllByText("A26")).toHaveLength(2);
  });

  it("filters by name", async () => {
    setup();
    await screen.findByText("Ann Smith");

    fireEvent.change(screen.getByRole("textbox", { name: "Search fencers" }), { target: { value: "di" } });

    expect(screen.queryByText("Ann Smith")).not.toBeInTheDocument();
    expect(screen.getByText("Di Smith")).toBeInTheDocument();
  });

  it("confirms the preselected fencers plus those newly checked", async () => {
    const onConfirm = setup();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Ann Smith" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirm edits" }));

    expect(onConfirm).toHaveBeenCalledWith([
      { id: "c4", name: "Di Smith" },
      { id: "c1", name: "Ann Smith" },
    ]);
  });
});
