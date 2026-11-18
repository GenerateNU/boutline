import { render, screen } from "@testing-library/react";

import { TabPageOnly } from "@/components/primitives/tab-page-only";

const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

describe("TabPageOnly", () => {
  it.each([
    { name: "the layout's own page", pathname: "/events/1", shown: true },
    { name: "a tab", pathname: "/events/1/pooling", shown: true },
    { name: "a trailing slash", pathname: "/events/1/pooling/", shown: true },
    { name: "a page nested under a tab", pathname: "/events/1/pooling/7", shown: false },
    { name: "a page two levels down", pathname: "/events/1/bout/7/referee", shown: false },
  ])("on $name, shown is $shown", ({ pathname, shown }) => {
    mockPathname.mockReturnValue(pathname);
    render(
      <TabPageOnly basePath="/events/1" fallback={<p>Fallback</p>}>
        <p>Header</p>
      </TabPageOnly>,
    );

    expect(screen.queryByText("Header") !== null).toBe(shown);
    expect(screen.queryByText("Fallback") !== null).toBe(!shown);
  });
});
