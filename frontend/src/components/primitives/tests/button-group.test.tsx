import { fireEvent, render, screen } from "@testing-library/react";

import { ButtonGroup } from "@/components/primitives/button-group";

const options = [
  { value: "semis", label: "Semi-finals" },
  { value: "finals", label: "Finals" },
];

describe("ButtonGroup", () => {
  it("marks only the button matching value as pressed", () => {
    render(
      <ButtonGroup options={options} value="finals" onValueChange={jest.fn()} aria-label="Rounds" />,
    );

    expect(screen.getByRole("group", { name: "Rounds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Semi-finals" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Finals" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the clicked option's value", () => {
    const onValueChange = jest.fn();
    render(
      <ButtonGroup options={options} value="finals" onValueChange={onValueChange} aria-label="Rounds" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Semi-finals" }));

    expect(onValueChange).toHaveBeenCalledWith("semis");
  });
});
