import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import type { Competitor } from "@/types/competitor";

import { EventFencerList } from "./event-fencer-list";

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const BASE: Competitor = {
  id: "c-1",
  eventId: "e1",
  tournamentId: "t1",
  firstName: "Yan",
  lastName: "Wang",
  rating: "A",
  ratingYear: 26,
  team: "Boston Blade Club",
  checkedInAt: null,
};

const COMPETITORS = [BASE, { ...BASE, id: "c-2", firstName: "Ada", lastName: "Lee", rating: "U", ratingYear: null }];

function renderList(editing: boolean) {
  render(
    <Toaster>
      <EventFencerList
        competitors={COMPETITORS}
        total={2}
        pageSize={25}
        query={{ tournamentId: "t1", eventId: "e1" }}
        editing={editing}
      />
    </Toaster>,
  );
}

describe("EventFencerList", () => {
  beforeEach(() => sessionStorage.clear());

  it("links each fencer to their page outside edit mode", () => {
    renderList(false);

    expect(screen.getByText("Yan Wang")).toBeInTheDocument();
    expect(screen.getByText("A26")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByTestId("EditOutlinedIcon")).not.toBeInTheDocument();
  });

  it("shows the pencil in edit mode and opens the fencer's edit dialog", () => {
    renderList(true);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("EditOutlinedIcon")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /^Ada Lee/ }));

    expect(screen.getByRole("dialog", { name: "Edit Fencer Information" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^First name/)).toHaveValue("Ada");
  });
});
