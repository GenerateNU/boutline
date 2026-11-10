import { fireEvent, render, screen } from "@testing-library/react";

import { DateField } from "@/components/primitives/date-field";

describe("DateField", () => {
  const triggerCases = [
    { name: "no default", defaultValue: undefined, text: "Select a date" },
    { name: "a default", defaultValue: new Date(2026, 9, 5), text: "Oct 5, 2026" },
  ];

  it.each(triggerCases)("shows the right text with $name", ({ defaultValue, text }) => {
    render(<DateField label="Start" defaultValue={defaultValue} />);
    expect(screen.getByRole("button", { name: "Start" })).toHaveTextContent(text);
  });

  it("picks a date from the calendar and closes", () => {
    const onValueChange = jest.fn();
    render(
      <DateField
        label="Start"
        defaultValue={new Date(2026, 9, 5)}
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("grid")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /October 9/ }));
    expect(screen.getByRole("button", { name: "Start" })).toHaveTextContent("Oct 9, 2026");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledWith(new Date(2026, 9, 9));
  });

  it("disables the trigger", () => {
    render(<DateField label="Start" disabled />);
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
  });
});
