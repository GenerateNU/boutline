import { render, screen } from "@testing-library/react";

import { StatusTabs } from "@/features/tournament/components/status-tabs";

describe("StatusTabs", () => {
  it.each([
    [undefined, "All"],
    ["pending", "Scheduled"],
    ["active", "In Progress"],
    ["ended", "Completed"],
  ] as const)("marks the %s tab as current", (status, label) => {
    render(<StatusTabs basePath="/admin/tournaments" status={status} />);

    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent(label);
  });

  it.each([
    ["All", "/admin/tournaments"],
    ["Completed", "/admin/tournaments?status=ended"],
    ["In Progress", "/admin/tournaments?status=active"],
    ["Scheduled", "/admin/tournaments?status=pending"],
  ])("links %s to %s", (label, href) => {
    render(<StatusTabs basePath="/admin/tournaments" />);

    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
  });
});
