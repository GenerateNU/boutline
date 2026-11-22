import { render, screen } from "@testing-library/react";
import { FencerBoutList } from "@/features/pinning/components/fencer-bout-list";
import type { FencerBout } from "@/features/pinning/types/fencer-bout";

function bout(status: FencerBout["status"], score: FencerBout["score"]): FencerBout {
  return { id: "b1", stage: "Pool 2", opponent: "Jane Doe", status, score };
}

describe("FencerBoutList", () => {
  it.each([
    ["ended", [5, 3], "5–3"],
    ["active", [2, 1], "2–1 · In Progress"],
    ["upcoming", null, "Upcoming"],
  ] as const)("shows a %s bout as %s", (status, score, text) => {
    render(<FencerBoutList bouts={[bout(status, score as FencerBout["score"])]} />);

    expect(screen.getByText("Pool 2 · vs Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("renders nothing when there are no bouts", () => {
    const { container } = render(<FencerBoutList bouts={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
