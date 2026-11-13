import { render, screen } from "@testing-library/react";

import { TabNav } from "@/components/primitives/tab-nav";

const mockSegment = jest.fn();
jest.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => mockSegment(),
  usePathname: () => "/tournaments/1",
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
      segment: null,
      current: "Overview",
      fencers: "/tournaments/1/fencers",
    },
    {
      name: "a root base path",
      basePath: "/",
      segment: "fencers",
      current: "Fencers",
      fencers: "/fencers",
    },
    {
      name: "a trailing slash",
      basePath: "/tournaments/1/",
      segment: "fencers",
      current: "Fencers",
      fencers: "/tournaments/1/fencers",
    },
  ])("links and marks the current tab with $name", ({ basePath, segment, current, fencers }) => {
    mockSegment.mockReturnValue(segment);
    render(<TabNav label="Sections" basePath={basePath} tabs={TABS} />);

    expect(screen.getByRole("link", { name: "Fencers" })).toHaveAttribute("href", fencers);
    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent(current);
  });
});
