import { fireEvent, render, screen } from "@testing-library/react";

import { ActiveFilterChips } from "@/features/tournament/components/active-filter-chips";

const replace = jest.fn();
const currentParams = new URLSearchParams("status=active&club=Salle+Nord&country=FR&q=open");

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tournaments",
  useSearchParams: () => currentParams,
}));
jest.mock("../../../services/api-request", () => ({ apiRequest: jest.fn() }));

describe("ActiveFilterChips", () => {
  beforeEach(() => replace.mockClear());

  it("renders nothing without filters", () => {
    const { container } = render(<ActiveFilterChips />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["In Progress", "/tournaments?club=Salle+Nord&country=FR&q=open"],
    ["Salle Nord", "/tournaments?status=active&country=FR&q=open"],
    ["France", "/tournaments?status=active&club=Salle+Nord&q=open"],
  ])("removes only the %s filter", (label, expected) => {
    render(<ActiveFilterChips status="active" club="Salle Nord" country="FR" />);

    expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `Remove ${label}` }));

    expect(replace).toHaveBeenLastCalledWith(expected, { scroll: false });
  });
});
