import { render, screen } from "@testing-library/react";

import { RefereeRow } from "@/features/referee/components/referee-row";

describe("RefereeRow", () => {
  it.each([
    { occupied: true, wantStatus: "Occupied" },
    { occupied: false, wantStatus: "Available" },
  ])("renders $wantStatus", ({ occupied, wantStatus }) => {
    render(<RefereeRow name="Yan Wang" occupied={occupied} pool="Pool 1" />);

    expect(screen.getByText("Yan Wang")).toBeInTheDocument();
    expect(screen.getByText(wantStatus)).toBeInTheDocument();
    expect(screen.getByText("Pool 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
