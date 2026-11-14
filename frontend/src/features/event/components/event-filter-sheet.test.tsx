import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { EventFilterSheet } from "@/features/event/components/event-filter-sheet";

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tournaments/t1/events",
  useSearchParams: () => currentParams,
}));

async function openSheet() {
  render(<EventFilterSheet eventDays={["2026-10-05"]} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Filter events" }));
  });
}

function toggle(group: string, option: string) {
  const buttons = within(screen.getByRole("radiogroup", { name: group }));
  fireEvent.click(buttons.getByRole("radio", { name: option }));
}

describe("EventFilterSheet", () => {
  beforeEach(() => {
    replace.mockClear();
    currentParams = new URLSearchParams();
  });

  it("lists the sections in order", async () => {
    await openSheet();

    const labels = screen
      .getAllByText(/^(Weapon|Age Category|Gender|Event Status|Date|Event Type)$/)
      .map((node) => node.textContent);
    expect(labels).toEqual([
      "Weapon",
      "Age Category",
      "Gender",
      "Event Status",
      "Date",
      "Event Type",
    ]);
  });

  it.each([
    { group: "Weapon", option: "Sabre", url: "weapon=sabre" },
    { group: "Gender", option: "Women's", url: "gender=female" },
    { group: "Gender", option: "Mixed", url: "gender=other" },
    { group: "Event Status", option: "Completed", url: "status=ended" },
    { group: "Event Status", option: "In Progress", url: "status=active" },
    { group: "Event Type", option: "Team", url: "type=team" },
  ])("sets $url from the $option toggle", async ({ group, option, url }) => {
    await openSheet();

    toggle(group, option);
    fireEvent.click(screen.getByRole("button", { name: "Show Events" }));

    expect(replace).toHaveBeenLastCalledWith(`/tournaments/t1/events?${url}`, { scroll: false });
  });

  it("keeps the search and clears every filter on Clear All", async () => {
    currentParams = new URLSearchParams("q=open&weapon=foil&type=team&date=2026-10-05");
    await openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Events" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments/t1/events?q=open", { scroll: false });
  });

  it("starts from the filters already in the URL", async () => {
    currentParams = new URLSearchParams("weapon=epee&date=2026-10-05");
    await openSheet();

    expect(screen.getByRole("radio", { name: "Epee" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Date" })).toHaveTextContent("Oct 5, 2026");
  });

  it("sets the picked date", async () => {
    currentParams = new URLSearchParams("date=2026-10-05");
    await openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Date" }));
    fireEvent.click(screen.getByRole("button", { name: /October 9/ }));
    fireEvent.click(screen.getByRole("button", { name: "Show Events" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments/t1/events?date=2026-10-09", {
      scroll: false,
    });
  });
});
