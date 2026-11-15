import { render, screen } from "@testing-library/react";

import { TabNav } from "@/components/primitives/tab-nav";

const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const TABS = [
  { label: "Overview", segment: null },
  { label: "Fencers", segment: "fencers" },
];

describe("TabNav", () => {
  it.each([
    {
      name: "a nested base path",
      basePath: "/tournaments/1",
      pathname: "/tournaments/1",
      current: "Overview",
      fencers: "/tournaments/1/fencers",
    },
    {
      name: "a root base path",
      basePath: "/",
      pathname: "/fencers",
      current: "Fencers",
      fencers: "/fencers",
    },
    {
      name: "a trailing slash",
      basePath: "/tournaments/1/",
      pathname: "/tournaments/1/fencers",
      current: "Fencers",
      fencers: "/tournaments/1/fencers",
    },
    {
      name: "a page nested under a tab",
      basePath: "/tournaments/1",
      pathname: "/tournaments/1/fencers/7",
      current: "Fencers",
      fencers: "/tournaments/1/fencers",
    },
  ])("links and marks the current tab with $name", ({ basePath, pathname, current, fencers }) => {
    mockPathname.mockReturnValue(pathname);
    render(<TabNav label="Sections" basePath={basePath} tabs={TABS} />);

    expect(screen.getByRole("link", { name: "Fencers" })).toHaveAttribute("href", fencers);
    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent(current);
  });

  it("marks no tab on a path outside them", () => {
    mockPathname.mockReturnValue("/tournaments/1/bout/3");
    render(<TabNav label="Sections" basePath="/tournaments/1" tabs={TABS} />);

    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});
