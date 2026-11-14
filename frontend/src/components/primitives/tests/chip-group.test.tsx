import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { ChipGroup, ChipGroupItem } from "@/components/primitives/chip-group";

function Harness({ onValueChange }: { onValueChange: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <ChipGroup
      label="Status"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
    >
      <ChipGroupItem value="a">Alpha</ChipGroupItem>
      <ChipGroupItem value="b">Beta</ChipGroupItem>
    </ChipGroup>
  );
}

describe("ChipGroup", () => {
  it("is reachable as a group named by its label", () => {
    render(<Harness onValueChange={jest.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Status" })).toBeInTheDocument();
  });

  it("reports the clicked value and replaces it on a second click", () => {
    const onValueChange = jest.fn();
    render(<Harness onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("radio", { name: "Alpha" }));
    expect(onValueChange).toHaveBeenLastCalledWith("a");

    fireEvent.click(screen.getByRole("radio", { name: "Beta" }));
    expect(onValueChange).toHaveBeenLastCalledWith("b");
  });
});
