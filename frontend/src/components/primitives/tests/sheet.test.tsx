import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { Sheet } from "@/components/primitives/sheet";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Add Pool"
      description="Fill in the pool details."
      trigger={<button type="button">Open</button>}
    >
      <p>Body</p>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens from its trigger, named and described", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "Add Pool" });
    expect(dialog).toHaveAccessibleDescription("Fill in the pool details.");
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("closes from the Close button", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
