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

  it("shows the pin button and the link together on a pinned row", () => {
    const { container } = render(
      <ListCard title="Annika Kim" description="Boston Blade Club" href="/fencers/1" pinned />,
    );

    expect(screen.getByRole("button", { name: "Unpin Annika Kim" })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/fencers/1");
    expect(container.querySelector("svg[data-testid='ChevronRightOutlinedIcon']")).not.toBeNull();
  });
});
