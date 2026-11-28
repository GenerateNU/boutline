import { render, screen } from "@testing-library/react";

import type { PoolBoard, PoolBout, PoolFencer } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";
import type { ScoringHistoryEntry } from "@/types/scoring";

import { BoutAuditLogDialog } from "./bout-audit-log-dialog";

jest.mock("../../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

function fencer(id: string, first: string, last: string): PoolFencer {
  return { competitor_id: id, first_name: first, last_name: last } as PoolFencer;
}

const POOL = { fencers: [fencer("a", "Ada", "Quinn"), fencer("b", "Bo", "Rivera")] } as PoolBoard;
const BOUT = { id: "b1" } as PoolBout;

function entry(id: number, competitorId: string, scores: [number, number], revoked: boolean): ScoringHistoryEntry {
  return {
    id,
    competitor_id: competitorId,
    points: 1,
    created_at: "2026-01-01T10:00:00Z",
    revoked_at: revoked ? "2026-01-01T10:01:00Z" : null,
    competitor_1_score: scores[0],
    competitor_2_score: scores[1],
  };
}

function renderDialog() {
  render(<BoutAuditLogDialog bout={BOUT} pool={POOL} onOpenChange={jest.fn()} />);
}

describe("BoutAuditLogDialog", () => {
  beforeEach(() => apiRequestMock.mockReset());

  it("lists each touch with the running score and marks revoked ones", async () => {
    apiRequestMock.mockResolvedValue({
      data: [entry(1, "a", [1, 0], false), entry(2, "b", [1, 1], true)],
    });
    renderDialog();

    expect(await screen.findByText("Touch ADA QUINN")).toBeInTheDocument();
    expect(screen.getByText("Touch BO RIVERA")).toBeInTheDocument();
    expect(screen.getByText("1 - 0")).toBeInTheDocument();
    expect(screen.getByText("1 - 1")).toBeInTheDocument();
    expect(screen.getAllByText("Revoked")).toHaveLength(1);
    expect(apiRequestMock).toHaveBeenCalledWith("/scoring/match/b1/history");
  });

  it("says so when no touches were recorded", async () => {
    apiRequestMock.mockResolvedValue({ data: [] });
    renderDialog();

    expect(await screen.findByText("No touches recorded.")).toBeInTheDocument();
  });

  it("shows an alert when the history fails to load", async () => {
    apiRequestMock.mockRejectedValue(new Error("history unavailable"));
    renderDialog();

    expect(await screen.findByRole("alert")).toHaveTextContent("history unavailable");
  });
});
