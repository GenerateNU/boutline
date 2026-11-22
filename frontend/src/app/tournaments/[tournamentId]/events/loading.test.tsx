import { render, screen } from "@testing-library/react";

import {
  rememberEventName,
  rememberTournamentName,
} from "@/features/event/lib/remembered-names";

import EventLoading from "./loading";

const mockParams = jest.fn();
const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  useParams: () => mockParams(),
  usePathname: () => mockPathname(),
}));

function renderAt(tournamentId: string, eventId: string, rest: string) {
  mockParams.mockReturnValue({ tournamentId, eventId });
  mockPathname.mockReturnValue(`/tournaments/${tournamentId}/events/${eventId}${rest}`);
  render(<EventLoading />);
}

describe("EventLoading", () => {
  rememberTournamentName("t-known", "Spring Open");
  rememberEventName("e-known", "Men's Epee");

  it.each([
    { tournamentId: "t-known", eventId: "e-known", backName: "Spring Open", heading: "Men's Epee" },
    { tournamentId: "t-unknown", eventId: "e-unknown", backName: "Back to tournament", heading: null },
  ])("draws the header for $tournamentId", ({ tournamentId, eventId, backName, heading }) => {
    renderAt(tournamentId, eventId, "/pooling");

    const backLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === `/tournaments/${tournamentId}`);
    expect(backLinks).toHaveLength(1);
    expect(backLinks[0]).toHaveAccessibleName(backName);
    expect(screen.queryByRole("heading", { level: 1 })?.textContent ?? null).toBe(heading);
  });

  it.each([
    { rest: "/pooling", skeleton: "Loading pools" },
    { rest: "/pooling/p1", skeleton: "Loading pool" },
    { rest: "/fencers", skeleton: null },
  ])("draws the matching skeleton under $rest", ({ rest, skeleton }) => {
    renderAt("t-known", "e-known", rest);

    const statuses = screen.getAllByRole("status").map((status) => status.textContent);
    expect(statuses).toEqual(skeleton ? ["Loading event", skeleton] : ["Loading event"]);
  });
});
