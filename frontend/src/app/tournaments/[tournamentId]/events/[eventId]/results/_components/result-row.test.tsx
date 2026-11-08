import { fireEvent, render, screen, within } from "@testing-library/react";

import { getPoolResults } from "../../_services/results";
import { ResultRow } from "./result-row";

describe("ResultRow", () => {
  it("opens the fencer's pool summary when tapped", () => {
    const [maya] = getPoolResults();
    render(<ResultRow standing={maya} place={1} fencerHref="/events/e1/fencers/maya" />);

    fireEvent.click(screen.getByRole("button", { name: /maya chen/i }));
    const dialog = screen.getByRole("dialog", { name: "Maya Chen" });

    expect(within(dialog).getByText("Fencer in pool 1")).toBeInTheDocument();
    expect(within(dialog).getByText("Place 1")).toBeInTheDocument();
    expect(within(dialog).getByText("3-0")).toBeInTheDocument();
    expect(within(dialog).getByText("+9")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(3);
    expect(within(dialog).getByRole("link", { name: /open fencer details/i })).toHaveAttribute(
      "href",
      "/events/e1/fencers/maya",
    );
  });
});
