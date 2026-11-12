import { fireEvent, render, screen } from "@testing-library/react";

import { PinnedItemsView } from "@/features/pinning/components/pinned-items-view";
import { PINNED_STORAGE_KEY, type PinnedIds } from "@/features/pinning/types/pinning";
import type { Competitor } from "@/types/competitor";

function fencer(id: string, firstName: string, tournamentId = "t1"): Competitor {
  return { id, eventId: "e1", tournamentId, firstName, lastName: "Smith", rating: "A", ratingYear: 26, team: "" };
}

const ann = fencer("f1", "Ann");
const cara = fencer("f3", "Cara", "t2");

function mockApi() {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const ids = new URL(String(input), "http://localhost").searchParams.get("ids")?.split(",") ?? [];
    const data = [ann, cara].filter(({ id }) => ids.includes(id));
    return { ok: true, status: 200, json: async () => ({ data, total: data.length, limit: data.length, offset: 0 }) };
  }) as jest.Mock;
}

function seed(pinned: PinnedIds) {
  window.sessionStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
}

function openTab(name: string) {
  // Radix Tabs switch on mousedown, not click.
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
}

describe("PinnedItemsView", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    mockApi();
  });

  it("has the All, Fencers, Clubs and Pools tabs", async () => {
    render(<PinnedItemsView />);

    await screen.findByText("No pinned fencers yet");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "All",
      "Fencers",
      "Clubs",
      "Pools",
    ]);
  });

  it("lists All's sections as Fencers, Clubs, Pools, each with its empty message", async () => {
    render(<PinnedItemsView />);

    await screen.findByText("No pinned fencers yet");
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "Fencers",
      "Clubs",
      "Pools",
    ]);
    expect(screen.getByText("No pinned clubs yet")).toBeInTheDocument();
    expect(screen.getByText("No pinned pools yet")).toBeInTheDocument();
  });

  it("links a pinned fencer to their page", async () => {
    seed({ fencerIds: ["f1"], boutIds: [] });
    render(<PinnedItemsView />);

    expect(await screen.findByRole("link", { name: /Ann Smith/ })).toHaveAttribute(
      "href",
      "/tournaments/t1/events/e1/fencers/f1",
    );
  });

  it("tapping the pin unpins the fencer", async () => {
    seed({ fencerIds: ["f1"], boutIds: [] });
    render(<PinnedItemsView />);

    fireEvent.click(await screen.findByRole("button", { name: "Unpin Ann Smith" }));

    expect(await screen.findByText("No pinned fencers yet")).toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem(PINNED_STORAGE_KEY) ?? "{}").fencerIds).toEqual([]);
  });

  it.each([
    { name: "only that tournament's pins", tournamentId: "t1", wantCara: false },
    { name: "every pin without a tournament", tournamentId: undefined, wantCara: true },
  ])("shows $name", async ({ tournamentId, wantCara }) => {
    seed({ fencerIds: ["f1", "f3"], boutIds: [] });
    render(<PinnedItemsView tournamentId={tournamentId} />);

    expect(await screen.findByRole("link", { name: /Ann Smith/ })).toBeInTheDocument();
    expect(Boolean(screen.queryByRole("link", { name: /Cara Smith/ }))).toBe(wantCara);
  });

  it.each([
    { tab: "Fencers", shows: "No pinned fencers yet", hides: "No pinned clubs yet" },
    { tab: "Clubs", shows: "No pinned clubs yet", hides: "No pinned pools yet" },
    { tab: "Pools", shows: "No pinned pools yet", hides: "No pinned clubs yet" },
  ])("shows only its section on the $tab tab", async ({ tab, shows, hides }) => {
    render(<PinnedItemsView />);
    await screen.findByText("No pinned fencers yet");

    openTab(tab);

    expect(screen.getByText(shows)).toBeInTheDocument();
    expect(screen.queryByText(hides)).not.toBeInTheDocument();
  });

  it("shows the loader until the pins arrive", async () => {
    seed({ fencerIds: ["f1"], boutIds: [] });
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    render(<PinnedItemsView />);

    expect(await screen.findByRole("status")).toHaveTextContent("Loading");
  });

  it("shows the error when loading fails", async () => {
    seed({ fencerIds: ["f1"], boutIds: [] });
    global.fetch = jest.fn().mockRejectedValue(new Error("Network down"));
    render(<PinnedItemsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
  });
});
