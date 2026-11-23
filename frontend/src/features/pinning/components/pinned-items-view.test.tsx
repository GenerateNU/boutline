import { fireEvent, render, screen, within } from "@testing-library/react";

import { buildPool } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_fixtures/build-pool";
import { PinnedItemsView } from "@/features/pinning/components/pinned-items-view";
import { PINNED_STORAGE_KEY, type PinnedItems } from "@/features/pinning/types/pinning";
import type { Competitor } from "@/types/competitor";

function fencer(id: string, firstName: string, tournamentId = "t1"): Competitor {
  return { id, eventId: "e1", tournamentId, firstName, lastName: "Smith", rating: "A", ratingYear: 26, team: "" };
}

const ANN = fencer("ann-smith", "Ann");
const CARA = fencer("cara-smith", "Cara", "t2");
const POOL_ONE = buildPool({
  number: 1,
  fencers: [
    ["Ann", "Smith", ""],
    ["First", "Last", ""],
  ],
  bouts: [[1, 2, 5, 3]],
});
const POOL_TWO = buildPool({
  number: 2,
  fencers: [
    ["Dee", "Jones", ""],
    ["Eve", "Jones", ""],
  ],
});

function annBout(id: string, opponent: string, status: string, score: number | null, opponentScore: number | null) {
  const [first, last] = opponent.split(" ");
  return {
    id,
    status,
    pool_id: "pool-1",
    pool_number: 1,
    round_size: null,
    slot: 1,
    opponent: { id: `${id}-opp`, first_name: first, last_name: last },
    score,
    opponent_score: opponentScore,
  };
}

// Ann's bouts as the backend returns them, already from her side.
const ANN_BOUTS = [
  annBout("b1", "First Last", "ended", 5, 3),
  annBout("b2", "Gail Hart", "active", 2, 1),
  annBout("b3", "Hugo Ito", "upcoming", null, null),
];

const EVENT_NAMES = { e1: "Mens Foil", e2: "Womens Epee" };

const NO_PINS: PinnedItems = { fencerIds: [], boutIds: [], clubs: [], pools: [], tableaus: [] };
const ALL_PINS: PinnedItems = {
  fencerIds: [],
  boutIds: [],
  clubs: [
    { tournamentId: "t1", name: "Alpha FC" },
    { tournamentId: "t2", name: "Beta FC" },
  ],
  pools: [
    { tournamentId: "t1", eventId: "e1", id: "pool-1" },
    { tournamentId: "t2", eventId: "e2", id: "pool-2" },
  ],
  tableaus: [
    { tournamentId: "t1", eventId: "e1" },
    { tournamentId: "t2", eventId: "e2" },
  ],
};

function respond(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function list(data: unknown[]) {
  return respond({ data, total: data.length, limit: data.length, offset: 0 });
}

// A request whose path matches `failing` rejects, as if the network dropped it.
function mockApi(failing?: RegExp) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const { pathname, searchParams } = new URL(String(input), "http://localhost");
    if (failing?.test(pathname)) {
      throw new Error("Network down");
    }
    const ids = searchParams.get("ids")?.split(",") ?? [];
    if (pathname.endsWith("/competitors/ann-smith/bouts")) {
      return respond({ data: ANN_BOUTS });
    }
    if (pathname.endsWith("/bouts")) {
      return respond({ data: [] });
    }
    if (pathname.endsWith("/competitors")) {
      return list([ANN, CARA].filter(({ id }) => ids.includes(id)));
    }
    if (pathname.endsWith("/pool-sheets")) {
      const pools = [POOL_ONE, POOL_TWO];
      return list(searchParams.has("ids") ? pools.filter(({ id }) => ids.includes(id)) : pools);
    }
    return respond({ rounds: [] });
  }) as jest.Mock;
}

function seed(pinned: Partial<PinnedItems>) {
  window.sessionStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify({ ...NO_PINS, ...pinned }));
}

function storedPins(): PinnedItems {
  return JSON.parse(window.sessionStorage.getItem(PINNED_STORAGE_KEY) ?? "{}");
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

  it("has the All, Fencers, Clubs, Pools and Tableaus tabs", async () => {
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);

    await screen.findByText("No pinned fencers yet");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "All",
      "Fencers",
      "Clubs",
      "Pools",
      "Tableaus",
    ]);
  });

  it("lists All's sections in order, each with its empty message", async () => {
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);

    await screen.findByText("No pinned fencers yet");
    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "Fencers",
      "Clubs",
      "Pools",
      "Tableaus",
    ]);
    expect(screen.getByText("No pinned clubs yet")).toBeInTheDocument();
    expect(screen.getByText("No pinned pools yet")).toBeInTheDocument();
    expect(screen.getByText("No pinned tableaus yet")).toBeInTheDocument();
  });

  it("opens a pinned fencer's pools and bouts in a dialog", async () => {
    seed({ fencerIds: ["ann-smith"] });
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);

    fireEvent.click(await screen.findByRole("button", { name: /^Ann Smith/ }));

    const dialog = await screen.findByRole("dialog", { name: "Ann Smith" });
    expect(await within(dialog).findByRole("heading", { name: "Pool 1 · Strip 1" })).toBeInTheDocument();
    const bouts = within(dialog).getByRole("list", { name: "Bouts" });
    expect(within(bouts).getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "Pool 1 · vs First Last5–3",
      "Pool 1 · vs Gail Hart2–1 · In Progress",
      "Pool 1 · vs Hugo ItoUpcoming",
    ]);
    expect(within(dialog).getByRole("link", { name: /Open fencer details/ })).toHaveAttribute(
      "href",
      "/tournaments/t1/events/e1/fencers/ann-smith",
    );
  });

  it("lists no bouts under the cards, only in the dialog", async () => {
    seed({ fencerIds: ["cara-smith"] });
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);

    fireEvent.click(await screen.findByRole("button", { name: /^Cara Smith/ }));

    const dialog = await screen.findByRole("dialog", { name: "Cara Smith" });
    expect(within(dialog).getByText("No bouts yet")).toBeInTheDocument();
    expect(within(dialog).queryByRole("list", { name: "Bouts" })).not.toBeInTheDocument();
  });

  it("tapping the pin unpins the fencer", async () => {
    seed({ fencerIds: ["ann-smith"] });
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);

    fireEvent.click(await screen.findByRole("button", { name: "Unpin Ann Smith" }));

    expect(await screen.findByText("No pinned fencers yet")).toBeInTheDocument();
    expect(storedPins().fencerIds).toEqual([]);
  });

  it.each([
    { name: "only that tournament's fencers", tournamentId: "t1", wantCara: false },
    { name: "every fencer without a tournament", tournamentId: undefined, wantCara: true },
  ])("shows $name", async ({ tournamentId, wantCara }) => {
    seed({ fencerIds: ["ann-smith", "cara-smith"] });
    render(<PinnedItemsView tournamentId={tournamentId} eventNames={EVENT_NAMES} />);

    expect(await screen.findByRole("button", { name: /^Ann Smith/ })).toBeInTheDocument();
    expect(Boolean(screen.queryByRole("button", { name: /^Cara Smith/ }))).toBe(wantCara);
  });

  it("renders pinned clubs, pools and tableaus scoped to the tournament", async () => {
    seed(ALL_PINS);
    render(<PinnedItemsView tournamentId="t1" eventNames={EVENT_NAMES} />);

    expect(await screen.findByRole("link", { name: /Alpha FC/ })).toHaveAttribute(
      "href",
      "/tournaments/t1/fencers?team=Alpha%20FC",
    );
    expect(screen.getByRole("link", { name: /Mens Foil/ })).toHaveAttribute(
      "href",
      "/tournaments/t1/events/e1/tableau",
    );
    // Pools from different events can share a title, so each card is labelled with its event.
    expect(screen.getByRole("heading", { name: "Pool 1 · Strip 1" }).closest("li")).toHaveTextContent("Mens Foil");
    expect(screen.getByRole("link", { name: "View pool" })).toHaveAttribute(
      "href",
      "/tournaments/t1/events/e1/pooling/pool-1",
    );
    expect(screen.queryByText(/Beta FC|Womens Epee|Pool 2/)).not.toBeInTheDocument();
  });

  it("sorts clubs by name, pools by event, and tableaus by event", async () => {
    seed({
      clubs: [
        { tournamentId: "t1", name: "Zeta FC" },
        { tournamentId: "t1", name: "alpha fc" },
      ],
      // Pool 1 is in Womens Epee, so Mens Foil's Pool 2 leads.
      pools: [
        { tournamentId: "t1", eventId: "e2", id: "pool-1" },
        { tournamentId: "t1", eventId: "e1", id: "pool-2" },
      ],
      tableaus: [
        { tournamentId: "t1", eventId: "e2" },
        { tournamentId: "t1", eventId: "e1" },
      ],
    });
    render(<PinnedItemsView tournamentId="t1" eventNames={EVENT_NAMES} />);

    const titlesIn = (section: string) =>
      within(screen.getByRole("heading", { name: section }).closest("section")!)
        .getAllByRole("listitem")
        .map((item) => item.querySelector("[data-slot=card-title], h3")?.textContent);

    await screen.findByRole("link", { name: /Zeta FC/ });
    expect(titlesIn("Clubs")).toEqual(["alpha fc", "Zeta FC"]);
    expect(titlesIn("Pools")).toEqual(["Pool 2 · Strip 2", "Pool 1 · Strip 1"]);
    expect(titlesIn("Tableaus")).toEqual(["Mens Foil", "Womens Epee"]);
  });

  it("renders every tournament's clubs, pools and tableaus without a tournament", async () => {
    seed(ALL_PINS);
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);

    expect(await screen.findByRole("link", { name: /Beta FC/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Womens Epee/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View pool" })).toHaveLength(2);
  });

  it.each([
    { kind: "club", field: "clubs", button: "Unpin Alpha FC", empty: "No pinned clubs yet" },
    { kind: "pool", field: "pools", button: "Unpin Pool 1 · Strip 1", empty: "No pinned pools yet" },
    { kind: "tableau", field: "tableaus", button: "Unpin Mens Foil", empty: "No pinned tableaus yet" },
  ] as const)("tapping the pin unpins the $kind", async ({ field, button, empty }) => {
    seed({ [field]: ALL_PINS[field] });
    render(<PinnedItemsView tournamentId="t1" eventNames={EVENT_NAMES} />);

    fireEvent.click(await screen.findByRole("button", { name: button }));

    expect(await screen.findByText(empty)).toBeInTheDocument();
    expect(storedPins()[field].map((item) => item.tournamentId)).toEqual(["t2"]);
  });

  it.each([
    { tab: "Fencers", shows: "No pinned fencers yet", hides: "No pinned clubs yet" },
    { tab: "Clubs", shows: "No pinned clubs yet", hides: "No pinned pools yet" },
    { tab: "Pools", shows: "No pinned pools yet", hides: "No pinned tableaus yet" },
    { tab: "Tableaus", shows: "No pinned tableaus yet", hides: "No pinned clubs yet" },
  ])("shows only its section on the $tab tab", async ({ tab, shows, hides }) => {
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);
    await screen.findByText("No pinned fencers yet");

    openTab(tab);

    expect(screen.getByText(shows)).toBeInTheDocument();
    expect(screen.queryByText(hides)).not.toBeInTheDocument();
  });

  it("shows a skeleton until the pins arrive", async () => {
    seed({ fencerIds: ["ann-smith"] });
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);

    expect(await screen.findByRole("status")).toHaveTextContent("Loading pins");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it.each([
    {
      case: "pinned fencers",
      failing: /\/competitors$/,
      section: "Fencers",
      stillShown: { role: "heading", name: "Pool 1 · Strip 1" },
    },
    {
      case: "pinned pools",
      failing: /\/pool-sheets$/,
      section: "Pools",
      stillShown: { role: "button", name: /^Ann Smith/ },
    },
  ])("keeps the other sections when $case fail to load", async ({ failing, section, stillShown }) => {
    mockApi(failing);
    seed({ ...ALL_PINS, fencerIds: ["ann-smith"] });
    render(<PinnedItemsView tournamentId="t1" eventNames={EVENT_NAMES} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Network down");
    expect(within(alert.closest("section")!).getByRole("heading", { level: 2 })).toHaveTextContent(section);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole(stillShown.role, { name: stillShown.name })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unpin Alpha FC" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unpin Mens Foil" })).toBeInTheDocument();
  });

  it("keeps the fencer cards and shows the error in the dialog when bouts fail to load", async () => {
    mockApi(/\/bouts$/);
    seed({ fencerIds: ["ann-smith"] });
    render(<PinnedItemsView eventNames={EVENT_NAMES} />);

    fireEvent.click(await screen.findByRole("button", { name: /^Ann Smith/ }));

    const dialog = await screen.findByRole("dialog", { name: "Ann Smith" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Network down");
  });
});
