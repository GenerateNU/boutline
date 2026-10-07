import { fireEvent, render, screen } from "@testing-library/react";
import { ExampleList } from "@/features/example/components/ExampleList";

const examples = [
  { id: "1", name: "First", createdAt: "2026-10-01T12:00:00Z" },
  { id: "2", name: "Second", createdAt: "2026-10-05T12:00:00Z" },
];

describe("ExampleList", () => {
  it("renders each example with its formatted date", () => {
    render(<ExampleList examples={examples} />);

    expect(screen.getByRole("button", { name: "First · Oct 1, 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Second · Oct 5, 2026" })).toBeInTheDocument();
  });

  it("selects one example at a time and deselects on a second click", () => {
    render(<ExampleList examples={examples} />);
    const first = screen.getByRole("button", { name: /First/ });
    const second = screen.getByRole("button", { name: /Second/ });

    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(second).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "false");
  });
});
