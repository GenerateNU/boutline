import { render, screen } from "@testing-library/react";

import { ListCard } from "@/components/primitives/list-card";

describe("ListCard", () => {
  it.each([
    { name: "a link with href", href: "/fencers/1", links: 1 },
    { name: "plain without href", href: undefined, links: 0 },
  ])("renders $name", ({ href, links }) => {
    render(<ListCard title="Annika Kim" description="Boston Blade Club" href={href} />);

    expect(screen.getByText("Annika Kim")).toBeInTheDocument();
    expect(screen.getByText("Boston Blade Club")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(links);
  });
});
