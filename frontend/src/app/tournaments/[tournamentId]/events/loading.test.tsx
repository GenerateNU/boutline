import { render, screen } from "@testing-library/react";

import {
  rememberEventName,
  rememberTournamentName,
} from "@/features/event/lib/remembered-names";

import EventLoading from "./loading";

const mockParams = jest.fn();
jest.mock("next/navigation", () => ({
  useParams: () => mockParams(),
  usePathname: () => `/tournaments/${mockParams().tournamentId}/events/${mockParams().eventId}/pooling`,
}));

describe("EventLoading", () => {
  rememberTournamentName("t-known", "Spring Open");
  rememberEventName("e-known", "Men's Epee");

  it.each([
    { tournamentId: "t-known", eventId: "e-known", backName: "Spring Open", heading: "Men's Epee" },
    { tournamentId: "t-unknown", eventId: "e-unknown", backName: "", heading: null },
  ])("draws the header for $tournamentId", ({ tournamentId, eventId, backName, heading }) => {
    mockParams.mockReturnValue({ tournamentId, eventId });

    render(<EventLoading />);

    const backLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === `/tournaments/${tournamentId}`);
    expect(backLinks).toHaveLength(1);
    expect(backLinks[0]).toHaveAccessibleName(backName);
    expect(screen.queryByRole("heading", { level: 1 })?.textContent ?? null).toBe(heading);
    expect(screen.getByText("Loading pools")).toBeInTheDocument();
  });
});
