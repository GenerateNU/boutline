import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { Toaster, useToast } from "@/components/primitives/toast";
import type { ToastOptions } from "@/components/primitives/toast";

function Harness({ options }: { options: ToastOptions }) {
  const { toast } = useToast();
  return <button onClick={() => toast(options)}>Show</button>;
}

function Wrapper({ withAction }: { withAction: boolean }) {
  const [undone, setUndone] = useState(false);
  return (
    <Toaster>
      <Harness
        options={{
          description: "Pins saved",
          action: withAction
            ? {
                label: "Undo",
                altText: "Undo pin save",
                onClick: () => setUndone(true),
              }
            : undefined,
        }}
      />
      {undone && <p>Undone</p>}
    </Toaster>
  );
}

describe("Toast", () => {
  it.each([
    { name: "with action", withAction: true },
    { name: "without action", withAction: false },
  ])("renders description and no close button $name", ({ withAction }) => {
    render(<Wrapper withAction={withAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(screen.getByText("Pins saved")).toBeTruthy();
    expect(Boolean(screen.queryByRole("button", { name: "Undo" }))).toBe(
      withAction,
    );
    expect(screen.queryByRole("button", { name: /dismiss|close/i })).toBeNull();
  });

  it("runs the action's onClick", () => {
    render(<Wrapper withAction />);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByText("Undone")).toBeTruthy();
  });
});
