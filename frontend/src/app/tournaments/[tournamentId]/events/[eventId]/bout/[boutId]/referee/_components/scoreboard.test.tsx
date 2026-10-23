import { fireEvent, render, screen, within } from "@testing-library/react";

import { ALICE, BEN, BOUT_ID, REFEREE_ID, installBackend, settle } from "../fake-backend";

import { Scoreboard } from "./scoreboard";

function scoreOf(name: string) {
  return screen.getByLabelText(`${name} score`).textContent;
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

  it.each([
    {
      name: "a touch",
      initial: [{ id: 1, competitor_id: BEN.id, points: 1 }],
      tap: "Touch Alice Chen",
      expected: { alice: "1", ben: "1" },
    },
    {
      name: "an undo",
      initial: [
        { id: 1, competitor_id: ALICE.id, points: 1 },
        { id: 2, competitor_id: BEN.id, points: 1 },
      ],
      tap: "Undo last touch",
      expected: { alice: "1", ben: "0" },
    },
  ])("counts $name once while the history is still loading", async ({ initial, tap, expected }) => {
    const { backend } = installBackend(initial);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    let releaseHistory = () => {};
    backend.historyGate = new Promise((resolve) => {
      releaseHistory = resolve;
    });
    fireEvent.click(screen.getByRole("button", { name: tap }));
    await settle();

    expect(scoreOf("Alice Chen")).toBe(expected.alice);
    expect(scoreOf("Ben Ortiz")).toBe(expected.ben);

    releaseHistory();
    await settle();
    expect(scoreOf("Alice Chen")).toBe(expected.alice);
    expect(scoreOf("Ben Ortiz")).toBe(expected.ben);
  });

  it("pauses scoring when it can't reload after a lost response, until a retry succeeds", async () => {
    const { backend, live } = installBackend([]);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    backend.loseNextCreateResponse = true;
    fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
    await settle();

    expect(screen.getByRole("alert", { name: "Out of sync" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
    await settle();
    expect(live()).toHaveLength(1);

    backend.offline = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await settle();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(scoreOf("Alice Chen")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
    await settle();
    expect(scoreOf("Alice Chen")).toBe("2");
    expect(live()).toHaveLength(2);
  });

  it("ignores Retry while a retry is already reloading", async () => {
    const { backend } = installBackend([]);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");
    backend.loseNextCreateResponse = true;
    fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
    await settle();

    backend.offline = false;
    let releaseHistory = () => {};
    backend.historyGate = new Promise((resolve) => {
      releaseHistory = resolve;
    });
    const boutReloads = () =>
      (global.fetch as jest.Mock).mock.calls.filter(([url]) => url === `/api/v1/bouts/${BOUT_ID}`).length;
    const before = boutReloads();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    releaseHistory();
    await settle();

    expect(boutReloads() - before).toBe(1);
    expect(screen.queryByRole("alert", { name: "Out of sync" })).not.toBeInTheDocument();
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
    if (banner === null) {
      expect(shown).not.toBeInTheDocument();
    } else {
      expect(shown).toHaveTextContent(banner);
    }
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

  describe("confirming the result", () => {
    async function showConfirming(initial = aliceOnMatchPoint) {
      const installed = installBackend(initial);
      render(<Scoreboard boutId={BOUT_ID} />);
      await screen.findByLabelText("Alice Chen score");
      fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
      await settle();
      return installed;
    }

    it("the winning touch asks both fencers to confirm instead of ending the bout", async () => {
      const { backend } = await showConfirming();

      expect(screen.getByRole("status", { name: "Confirm result" })).toHaveTextContent(
        "Alice Chen wins 5 - 0",
      );
      expect(screen.queryByRole("button", { name: /^Touch / })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirm Alice Chen" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Confirm Ben Ortiz" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Undo last touch" })).toBeEnabled();
      expect(backend.status).toBe("active");
    });

    it.each([
      {
        name: "one confirmation keeps the bout open",
        confirms: ["Confirm Alice Chen"],
        over: false,
        status: "active",
      },
      {
        name: "both confirmations end the bout",
        confirms: ["Confirm Alice Chen", "Confirm Ben Ortiz"],
        over: true,
        status: "ended",
      },
    ])("$name", async ({ confirms, over, status }) => {
      const { backend } = await showConfirming();

      for (const label of confirms) {
        fireEvent.click(screen.getByRole("button", { name: label }));
      }
      await settle();

      const bout = screen.queryByRole("status", { name: "Bout over" });
      if (over) {
        expect(bout).toHaveTextContent("Alice Chen wins");
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
      } else {
        expect(bout).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Alice Chen confirmed" })).toBeDisabled();
      }
      expect(backend.status).toBe(status);
    });

    it("undo after one confirmation reopens scoring and resets the confirmations", async () => {
      await showConfirming();

      fireEvent.click(screen.getByRole("button", { name: "Confirm Alice Chen" }));
      fireEvent.click(screen.getByRole("button", { name: "Undo last touch" }));
      await settle();

      expect(screen.getByRole("button", { name: "Touch Alice Chen" })).toBeInTheDocument();
      expect(scoreOf("Alice Chen")).toBe("4");
      expect(scoreOf("Ben Ortiz")).toBe("0");
      expect(screen.queryByRole("button", { name: /^Confirm / })).not.toBeInTheDocument();
      expect(historyRows()[0]).toContain("Alice Chen5 - 0Revoked");
      expect(historyRows()[1]).toContain("Alice Chen4 - 0");

      fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
      await settle();
      expect(screen.getByRole("button", { name: "Confirm Alice Chen" })).toBeEnabled();
    });

    it("voids confirmations given while a failed end is still recovering", async () => {
      const { backend } = await showConfirming();

      backend.failNextEnd = true;
      let releaseHistory = () => {};
      backend.historyGate = new Promise((resolve) => {
        releaseHistory = resolve;
      });
      fireEvent.click(screen.getByRole("button", { name: "Confirm Alice Chen" }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm Ben Ortiz" }));
      await settle();
      // The reload is waiting on the history, so the end's recovery is still running.
      fireEvent.click(screen.getByRole("button", { name: "Confirm Alice Chen" }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm Ben Ortiz" }));
      releaseHistory();
      await settle();

      expect(screen.getByRole("button", { name: "Confirm Alice Chen" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Confirm Ben Ortiz" })).toBeEnabled();
      expect(backend.status).toBe("active");
    });

    it("shows the error and asks again when the bout cannot be ended", async () => {
      const { backend } = await showConfirming();

      backend.failNextEnd = true;
      fireEvent.click(screen.getByRole("button", { name: "Confirm Alice Chen" }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm Ben Ortiz" }));
      await settle();

      expect(screen.getByRole("alert")).toHaveTextContent("could not end bout");
      expect(screen.getByRole("status", { name: "Confirm result" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirm Alice Chen" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Confirm Ben Ortiz" })).toBeEnabled();
      expect(backend.status).toBe("active");
    });
  });

  it("an upcoming bout shows Start match instead of scoring, and starting opens the normal flow", async () => {
    const { backend } = installBackend([], { status: "upcoming" });
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    expect(screen.queryByRole("status", { name: "Bout over" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Touch Alice Chen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo last touch" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start match" }));
    expect(screen.getByRole("button", { name: "Starting…" })).toBeDisabled();
    await settle();

    expect(backend.status).toBe("active");
    expect(screen.queryByRole("button", { name: "Start match" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Touch Alice Chen" }));
    await settle();
    expect(scoreOf("Alice Chen")).toBe("1");
  });

  it.each([
    { name: "the assigned referee", refereeId: REFEREE_ID, expected: REFEREE_ID },
    { name: "the seeded fallback user when no referee is assigned", refereeId: null, expected: "a0000000-0000-4000-8000-000000000001" },
  ])("starts an upcoming bout refereed by $name", async ({ refereeId, expected }) => {
    const { backend } = installBackend([], { status: "upcoming", refereeId });
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    fireEvent.click(screen.getByRole("button", { name: "Start match" }));
    await settle();

    expect(backend.status).toBe("active");
    expect(backend.refereeId).toBe(expected);
    expect(screen.getByRole("button", { name: "Touch Alice Chen" })).toBeInTheDocument();
  });

  it("keeps Start match and shows the reason when the backend refuses to start", async () => {
    const { backend } = installBackend([], { status: "upcoming" });
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    // Another device started it after this screen loaded.
    backend.status = "active";
    fireEvent.click(screen.getByRole("button", { name: "Start match" }));
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent("only an upcoming bout can be started");
    expect(backend.refereeId).toBe(REFEREE_ID);
  });

  it("shows only the final score for a bout that has already ended, without naming a winner short of the target", async () => {
    installBackend([{ id: 1, competitor_id: BEN.id, points: 1 }], { status: "ended" });
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
      "Ben Ortiz",
      "Ben Ortiz1 - 1",
      "Alice Chen1 - 0",
    ]);

    await settle();
    expect(historyRows().map((row) => row?.replace(/^.*Touch /, ""))).toEqual([
      "Ben Ortiz1 - 2",
      "Ben Ortiz1 - 1",
      "Alice Chen1 - 0",
    ]);
    expect(historyRows().join()).not.toContain("Saving…");
  });

  it("says the history couldn't load instead of claiming there are no touches", async () => {
    const { backend } = installBackend([{ id: 1, competitor_id: ALICE.id, points: 1 }]);
    backend.failHistory = true;
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");
    await settle();

    expect(screen.getByText("Couldn't load the latest score history.")).toBeInTheDocument();
    expect(screen.queryByText("No touches yet.")).not.toBeInTheDocument();
    expect(scoreOf("Alice Chen")).toBe("1");

    backend.failHistory = false;
    fireEvent.click(screen.getByRole("button", { name: "Touch Ben Ortiz" }));
    await settle();

    expect(screen.queryByText("Couldn't load the latest score history.")).not.toBeInTheDocument();
    expect(historyRows()).toHaveLength(2);
  });

  it("keeps an undone touch in the history with the score it produced, marked Revoked", async () => {
    installBackend([
      { id: 1, competitor_id: ALICE.id, points: 1 },
      { id: 2, competitor_id: BEN.id, points: 1 },
    ]);
    render(<Scoreboard boutId={BOUT_ID} />);
    await screen.findByLabelText("Alice Chen score");

    fireEvent.click(screen.getByRole("button", { name: "Undo last touch" }));
    // Nothing is marked until the server confirms the undo.
    expect(historyRows().some((row) => row?.includes("Revoked"))).toBe(false);
    await settle();

    expect(scoreOf("Ben Ortiz")).toBe("0");
    expect(historyRows().map((row) => row?.replace(/^.*Touch /, ""))).toEqual([
      "Ben Ortiz1 - 1Revoked",
      "Alice Chen1 - 0",
    ]);
  });
});
