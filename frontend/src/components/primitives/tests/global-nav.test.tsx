import { act, fireEvent, render, screen } from "@testing-library/react";

import { GlobalNav } from "@/components/primitives/global-nav";

jest.mock("next/navigation", () => ({
  usePathname: () => "/tournaments",
  useRouter: () => ({ push: jest.fn() }),
}));

async function press(element: HTMLElement) {
  await act(async () => {
    fireEvent.pointerDown(element);
    fireEvent.click(element);
  });
}

describe("GlobalNav", () => {
  it("opens and closes the drawer from the same hamburger", async () => {
    render(<GlobalNav />);

    await press(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("dialog", { name: "BOUTLINE" })).toBeInTheDocument();

    // The drawer's outside-click listener attaches on the next tick.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await press(screen.getByRole("button", { name: "Close menu", hidden: true }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  });
});
