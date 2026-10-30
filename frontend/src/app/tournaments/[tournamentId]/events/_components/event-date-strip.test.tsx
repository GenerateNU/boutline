import { render, screen, within } from "@testing-library/react";

import { EventDateStrip } from "./event-date-strip";

const days = ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"];
const base = "/tournaments/t1/events";

describe("EventDateStrip", () => {
  const cases = [
    {
      name: "the first day",
      selected: "2026-10-04",
      search: "",
      current: "Oct 4",
      previous: null,
      next: `${base}?date=2026-10-05`,
    },
    {
      name: "a middle day with a search",
      selected: "2026-10-06",
      search: "foil",
      current: "Oct 6",
      previous: `${base}?date=2026-10-05&q=foil`,
      next: `${base}?date=2026-10-07&q=foil`,
    },
    {
      name: "the last day",
      selected: "2026-10-07",
      search: "",
      current: "Oct 7",
      previous: `${base}?date=2026-10-06`,
      next: null,
    },
  ];

  it.each(cases)(
    "renders $name",
    ({ selected, search, current, previous, next }) => {
      render(
        <EventDateStrip
          basePath={base}
          days={days}
          selected={selected}
          search={search}
        />,
      );

      const dayLinks = within(screen.getByRole("list")).getAllByRole("link");
      expect(dayLinks).toHaveLength(3);
      expect(
        dayLinks.filter((link) => link.getAttribute("aria-current") === "date"),
      ).toHaveLength(1);
      expect(screen.getByRole("link", { current: "date" })).toHaveTextContent(
        current,
      );

      for (const [label, href] of [
        ["Previous day", previous],
        ["Next day", next],
      ] as const) {
        const step = screen.getByLabelText(label);
        if (href === null) {
          expect(step).toBeDisabled();
        } else {
          expect(step).toHaveAttribute("href", href);
        }
      }
    },
  );
});
