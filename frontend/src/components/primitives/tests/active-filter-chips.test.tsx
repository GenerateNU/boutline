import { fireEvent, render, screen } from "@testing-library/react";

import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";

const replace = jest.fn();
const CURRENT_PARAMS = new URLSearchParams("status=active&club=Salle+Nord&country=FR&q=open");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tournaments",
  useSearchParams: () => CURRENT_PARAMS,
}));

describe("ActiveFilterChips", () => {
  beforeEach(() => replace.mockClear());

  it("renders nothing without filters", () => {
    const { container } = render(<ActiveFilterChips filters={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["Status: In Progress", "status", "/tournaments?club=Salle+Nord&country=FR&q=open"],
    ["Club: Salle Nord", "club", "/tournaments?status=active&country=FR&q=open"],
    ["Country: France", "country", "/tournaments?status=active&club=Salle+Nord&q=open"],
  ])("removes only the %s filter", (label, _param, expected) => {
    render(
      <ActiveFilterChips
        filters={[
          { param: "status", name: "Status", value: "In Progress" },
          { param: "club", name: "Club", value: "Salle Nord" },
          { param: "country", name: "Country", value: "France" },
        ]}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `Remove ${label}` }));

    expect(replace).toHaveBeenLastCalledWith(expected, { scroll: false });
  });

  // useSearchParams stays on the pre-navigation snapshot until the replace
  // commits, so the second dismissal has to build on the first.
  it("keeps the first dismissal when a second lands before it commits", () => {
    render(
      <ActiveFilterChips
        filters={[
          { param: "status", name: "Status", value: "In Progress" },
          { param: "club", name: "Club", value: "Salle Nord" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove Status: In Progress" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Club: Salle Nord" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments?country=FR&q=open", {
      scroll: false,
    });
  });
});
