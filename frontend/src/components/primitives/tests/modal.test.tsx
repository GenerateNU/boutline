import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { Modal, ModalFooter } from "@/components/primitives/modal";

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Log out"
      description="You will need to sign in again."
    >
      <ModalFooter>
        <button type="button">Cancel</button>
        <button type="button">Yes, log out</button>
      </ModalFooter>
    </Modal>
  );
}

describe("Modal", () => {
  it("is named by its title and described by its description", () => {
    render(<Harness />);

    const dialog = screen.getByRole("dialog", { name: "Log out" });
    expect(dialog).toHaveAccessibleDescription("You will need to sign in again.");
  });

  it("renders its children", () => {
    render(<Harness />);

    expect(screen.getByRole("button", { name: "Yes, log out" })).toBeInTheDocument();
  });

  it("closes from the Close button", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
