import { fireEvent, render, screen } from "@testing-library/react";

import { ConfirmDeleteModal } from "@/components/primitives/confirm-delete-modal";

function setup(pending: boolean) {
  const onConfirm = jest.fn();
  const onOpenChange = jest.fn();
  render(
    <ConfirmDeleteModal
      open
      onOpenChange={onOpenChange}
      title="Delete Pool?"
      pending={pending}
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("ConfirmDeleteModal", () => {
  it("is named by its title and warns the change is permanent", () => {
    setup(false);

    expect(screen.getByRole("dialog", { name: "Delete Pool?" })).toHaveAccessibleDescription(
      "You cannot undo this change later.",
    );
  });

  it("confirms and cancels", () => {
    const { onConfirm, onOpenChange } = setup(false);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables Confirm while pending", () => {
    setup(true);

    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });
});
