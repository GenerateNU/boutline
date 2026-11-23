import { fireEvent, render, screen } from "@testing-library/react";

import { ListCard } from "@/components/primitives/list-card";

describe("ListCard", () => {
  it.each([
    { name: "a link with href", href: "/fencers/1", onSelect: undefined, links: 1, buttons: 0 },
    { name: "plain without href", href: undefined, onSelect: undefined, links: 0, buttons: 0 },
    { name: "a button with onSelect", href: undefined, onSelect: jest.fn(), links: 0, buttons: 1 },
  ])("renders $name", ({ href, onSelect, links, buttons }) => {
    render(
      <ListCard title="Annika Kim" description="Boston Blade Club" href={href} onSelect={onSelect} />,
    );

    expect(screen.getByText("Annika Kim")).toBeInTheDocument();
    expect(screen.getByText("Boston Blade Club")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(links);
    expect(screen.queryAllByRole("button")).toHaveLength(buttons);

    if (onSelect) {
      fireEvent.click(screen.getByRole("button", { name: /annika kim/i }));
      expect(onSelect).toHaveBeenCalledTimes(1);
    }
  });
});
