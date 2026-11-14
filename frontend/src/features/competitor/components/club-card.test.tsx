import { render, screen } from "@testing-library/react";

import { ClubCard } from "@/features/competitor/components/club-card";

describe("ClubCard", () => {
  it.each([
    { name: "with a link", href: "/tournaments/t1/fencers?team=Generate" },
    { name: "without a link", href: undefined },
  ])("shows the club name and a location placeholder $name", ({ href }) => {
    render(<ClubCard team={{ name: "Generate", competitorCount: 4 }} href={href} />);

    expect(screen.getByText("Generate")).toBeInTheDocument();
    expect(screen.getByText(/Location TBC/)).toBeInTheDocument();
    expect(screen.queryByText(/fencers?$/)).not.toBeInTheDocument();
  });
});
