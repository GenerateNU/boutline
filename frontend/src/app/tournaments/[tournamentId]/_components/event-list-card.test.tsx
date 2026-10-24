import { render, screen, within } from "@testing-library/react";

import { EventListCard } from "./event-list-card";
import type { TournamentEvent } from "@/features/event/types/event";

function makeEvent(overrides: Partial<TournamentEvent>): TournamentEvent {
  return {
    id: "e1",
    tournament_id: "t1",
    format: "pool_then_direct_elimination",
    name: "Event",
    status: "active",
    start_time: null,
    started_at: null,
    completed_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

const normalise = (text: string | null) => (text ?? "").replace(/\s/g, " ");

describe("EventListCard", () => {
  const cases = [
    {
      name: "events present, in the given order",
      title: "Ongoing Events",
      events: [
        makeEvent({
          id: "e1",
          name: "Mixed Épée",
          status: "active",
          start_time: "2026-10-12T09:00:00Z",
        }),
        makeEvent({
          id: "e2",
          name: "Women's Foil",
          status: "upcoming",
          start_time: "2026-10-12T13:30:00Z",
        }),
        makeEvent({ id: "e3", name: "Open Sabre", status: "upcoming" }),
      ],
      rows: [
        ["9:00 AM", "Mixed Épée", "Live"],
        ["1:30 PM", "Women's Foil", "Upcoming"],
        ["TBC", "Open Sabre", "Upcoming"],
      ],
    },
    { name: "no events", title: "Upcoming Events", events: [], rows: [] },
  ];

  it.each(cases)("renders $name", ({ title, events, rows }) => {
    render(
      <EventListCard title={title} events={events} emptyMessage="Nothing here." />,
    );

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();

    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(rows.length);
    rows.forEach((row, i) => {
      const text = normalise(buttons[i].textContent);
      row.forEach((part) => expect(text).toContain(part));
      expect(within(buttons[i]).getByText(row[1])).toBeInTheDocument();
    });

    if (rows.length === 0) {
      expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    } else {
      expect(screen.queryByText("Nothing here.")).not.toBeInTheDocument();
    }
  });
});
