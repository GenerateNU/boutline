import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { BoutStatus } from "@/types/bout";

import { Scoreboard } from "./scoreboard";

const BOUT_ID = "b0000000-0000-4000-8000-000000000000";
const REFEREE_ID = "r0000000-0000-4000-8000-000000000000";
const ALICE = { id: "c1", firstName: "Alice", lastName: "Chen", team: "Boston FC" };
const BEN = { id: "c2", firstName: "Ben", lastName: "Ortiz", team: "" };
const RECORDED_AT = "2026-10-14T12:00:00Z";

interface StoredScore {
  id: number;
  competitor_id: string;
  points: number;
  revoked: boolean;
  created_at: string;
  created_by?: string;
}

interface FakeBackend {
  scores: StoredScore[];
  status: BoutStatus;
  failNextCreate: boolean;
}

interface BackendOptions {
  refereeId?: string | null;
  status?: BoutStatus;
}

function reply(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body } as unknown as Response;
}

// Mirrors the scoring routes closely enough to check what the referee sees
// against what the server ended up storing.
function installBackend(
  initial: Pick<StoredScore, "id" | "competitor_id" | "points">[],
  { refereeId = REFEREE_ID, status = "active" }: BackendOptions = {},
) {
  const backend: FakeBackend = {
    scores: initial.map((score) => ({ ...score, revoked: false, created_at: RECORDED_AT })),
    status,
    failNextCreate: false,
  };
  const boutBody = () => ({
    id: BOUT_ID,
    referee_id: refereeId,
    competitor_1_id: ALICE.id,
    competitor_2_id: BEN.id,
    points_to_win: 5,
    status: backend.status,
  });
  const live = () => backend.scores.filter((score) => !score.revoked);

  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : null;

    if (url === `/api/v1/bouts/${BOUT_ID}`) return reply(200, boutBody());
    if (url === `/api/v1/bouts/${BOUT_ID}/end`) {
      if (backend.status !== "active") return reply(409, { detail: "only an active bout can be ended" });
      backend.status = "end";
      return reply(200, boutBody());
    }
    if (url === "/api/v1/bouts/p1") {
      return reply(422, {
        detail: "validation failed",
        errors: [{ location: "path.id", message: "expected string to be RFC 4122 uuid", value: "p1" }],
      });
    }
    if (url === `/api/v1/competitors/${ALICE.id}`) return reply(200, ALICE);
    if (url === `/api/v1/competitors/${BEN.id}`) return reply(200, BEN);
    if (url.startsWith(`/api/v1/scoring/match/${BOUT_ID}`)) {
      // The real endpoint returns newest first.
      return reply(200, { data: [...live()].reverse() });
    }
    if (url === "/api/v1/scoring" && init?.method === "POST") {
      if (backend.failNextCreate) {
        backend.failNextCreate = false;
        return reply(500, { detail: "database unavailable" });
      }
      const created = {
        id: Math.max(0, ...backend.scores.map((score) => score.id)) + 1,
        competitor_id: body.competitor_id,
        created_by: body.created_by,
        points: 1,
        revoked: false,
        created_at: RECORDED_AT,
      };
      backend.scores.push(created);
      return reply(201, created);
    }
    const revoke = url.match(/^\/api\/v1\/scoring\/(\d+)\/revoke$/);
    if (revoke) {
      const target = backend.scores.find((score) => score.id === Number(revoke[1]));
      if (!target || target.revoked) return reply(409, { detail: "score has already been revoked" });
      target.revoked = true;
      return reply(200, target);
    }
    return reply(404, { detail: "not found" });
  }) as typeof fetch;

  return { backend, live };
}

function scoreOf(name: string) {
  return screen.getByLabelText(`${name} score`).textContent;
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("Scoreboard", () => {
  it.each([
    {
      name: "sums each fencer's live touches from the server",
      initial: [
        { id: 1, competitor_id: ALICE.id, points: 1 },
        { id: 2, competitor_id: BEN.id, points: 1 },
        { id: 3, competitor_id: ALICE.id, points: 2 },
      ],
      taps: [],
      expected: { alice: "3", ben: "1" },
    },
    {
      name: "records a touch for the fencer whose plus was tapped",
      initial: [],
      taps: ["Touch Ben Ortiz", "Touch Ben Ortiz", "Touch Alice Chen"],
      expected: { alice: "1", ben: "2" },
    },
    {
      name: "undo reverts the most recent touch, not the first listed",
      initial: [
        { id: 1, competitor_id: ALICE.id, points: 1 },
        { id: 2, competitor_id: BEN.id, points: 1 },
      ],
      taps: ["Undo last touch"],
      expected: { alice: "1", ben: "0" },
    },
    {
      name: "undo tapped before a touch is saved reverts that touch",
      initial: [{ id: 1, competitor_id: BEN.id, points: 1 }],
      taps: ["Touch Alice Chen", "Undo last touch"],
      expected: { alice: "0", ben: "1" },
    },
  ])("$name", async ({ initial, taps, expected }) => {
    const { live } = installBackend(initial);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    for (const label of taps) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }
    await settle();

    expect(scoreOf("Alice Chen")).toBe(expected.alice);
    expect(scoreOf("Ben Ortiz")).toBe(expected.ben);
    const stored = (id: string) =>
      live()
        .filter((score) => score.competitor_id === id)
        .reduce((total, score) => total + score.points, 0);
    expect(String(stored(ALICE.id))).toBe(expected.alice);
    expect(String(stored(BEN.id))).toBe(expected.ben);
  });

  it("shows the error, drops taps queued behind the failure, and keeps the server score", async () => {
    const { backend, live } = installBackend([{ id: 1, competitor_id: BEN.id, points: 1 }]);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    backend.failNextCreate = true;
    fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo last touch" }));
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent("database unavailable");
    expect(scoreOf("Alice Chen")).toBe("0");
    expect(scoreOf("Ben Ortiz")).toBe("1");
    expect(live()).toHaveLength(1);
  });

  // The fake bout is first to 5.
  it.each([
    { name: "no banner short of match point", alice: 3, ben: 2, banner: null },
    { name: "names the fencer one touch from winning", alice: 4, ben: 2, banner: "Alice Chen" },
    { name: "names both fencers when tied on match point", alice: 4, ben: 4, banner: "Alice Chen and Ben Ortiz" },
    { name: "no banner once the bout is won", alice: 5, ben: 4, banner: null },
  ])("match point: $name", async ({ alice, ben, banner }) => {
    let id = 0;
    const touches = (competitorId: string, count: number) =>
      Array.from({ length: count }, () => ({ id: ++id, competitor_id: competitorId, points: 1 }));
    installBackend([...touches(ALICE.id, alice), ...touches(BEN.id, ben)]);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    const shown = screen.queryByRole("status", { name: "Match point" });
    if (banner === null) expect(shown).not.toBeInTheDocument();
    else expect(shown).toHaveTextContent(banner);
  });

  it("flashes the match point banner as soon as the touch is tapped", async () => {
    installBackend([
      { id: 1, competitor_id: BEN.id, points: 1 },
      { id: 2, competitor_id: BEN.id, points: 1 },
      { id: 3, competitor_id: BEN.id, points: 1 },
    ]);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    fireEvent.click(screen.getByRole("button", { name: "Touch Ben Ortiz" }));

    expect(screen.getByRole("status", { name: "Match point" })).toHaveTextContent("Ben Ortiz");
    await settle();
  });

  it("explains which field failed when the bout id is rejected", async () => {
    installBackend([]);
    render(<Scoreboard boutId="p1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "validation failed (path.id: expected string to be RFC 4122 uuid)",
    );
  });

  it.each([
    { name: "the assigned referee", refereeId: REFEREE_ID, expected: REFEREE_ID },
    { name: "the seeded fallback user when no referee is assigned", refereeId: null, expected: "a0000000-0000-4000-8000-000000000001" },
  ])("records touches as $name", async ({ refereeId, expected }) => {
    const { live } = installBackend([], { refereeId });
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
    await settle();

    expect(scoreOf("Alice Chen")).toBe("1");
    expect(live().map((score) => score.created_by)).toEqual([expected]);
  });

  const aliceOnMatchPoint = [1, 2, 3, 4].map((id) => ({ id, competitor_id: ALICE.id, points: 1 }));

  it.each([
    { name: "an active bout ends on the server", status: "active" as const, expectedStatus: "end" },
    // The backend refuses to end a bout that never started, so it stays as it was.
    { name: "an upcoming bout locks without ending", status: "upcoming" as const, expectedStatus: "upcoming" },
  ])("the winning touch: $name", async ({ status, expectedStatus }) => {
    const { backend, live } = installBackend(aliceOnMatchPoint, { status });
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));

    // The buttons go the moment the winning touch is tapped, not once it is saved.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    await settle();

    expect(screen.getByRole("status", { name: "Bout over" })).toHaveTextContent("Alice Chen wins");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(scoreOf("Alice Chen")).toBe("5");
    expect(scoreOf("Ben Ortiz")).toBe("0");
    expect(live()).toHaveLength(5);
    expect(backend.status).toBe(expectedStatus);
  });

  it("shows only the final score for a bout that has already ended, without naming a winner short of the target", async () => {
    installBackend([{ id: 1, competitor_id: BEN.id, points: 1 }], { status: "end" });
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    expect(screen.getByRole("status", { name: "Bout over" })).not.toHaveTextContent("wins");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(scoreOf("Ben Ortiz")).toBe("1");
  });

  function historyRows() {
    return within(screen.getByRole("list", { name: "Score history" }))
      .getAllByRole("listitem")
      .map((row) => row.textContent);
  }

  it("lists touches newest first with the running score, including one still saving", async () => {
    installBackend([
      { id: 1, competitor_id: ALICE.id, points: 1 },
      { id: 2, competitor_id: BEN.id, points: 1 },
    ]);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    fireEvent.click(screen.getByRole("button", { name: "Touch Ben Ortiz" }));

    const rows = historyRows();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("Saving…");
    expect(rows.map((row) => row?.replace(/^.*Touch /, ""))).toEqual([
      "Ben Ortiz1 - 2",
      "Ben Ortiz1 - 1",
      "Alice Chen1 - 0",
    ]);

    await settle();
    expect(historyRows()[0]).not.toContain("Saving…");
  });

  it("drops an undone touch from the history", async () => {
    installBackend([
      { id: 1, competitor_id: ALICE.id, points: 1 },
      { id: 2, competitor_id: BEN.id, points: 1 },
    ]);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    fireEvent.click(screen.getByRole("button", { name: "Undo last touch" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo last touch" }));
    await settle();

    expect(screen.queryByRole("list", { name: "Score history" })).not.toBeInTheDocument();
    expect(screen.getByText("No touches yet.")).toBeInTheDocument();
  });
});
