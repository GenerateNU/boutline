import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { DateField } from "@/components/primitives/date-field";

interface DateFieldTestProps
  extends Omit<React.ComponentProps<typeof DateField>, "label" | "value" | "onValueChange"> {
  initial?: Date;
  onValueChange?: (date: Date) => void;
}

function ControlledDateField({ initial, onValueChange, ...props }: DateFieldTestProps) {
  const [date, setDate] = useState(initial);
  return (
    <DateField
      label="Start"
      value={date}
      onValueChange={(next) => {
        setDate(next);
        onValueChange?.(next);
      }}
      {...props}
    />
  );
}

describe("DateField", () => {
  it.each([
    { name: "no value", initial: undefined, text: "Select date" },
    { name: "a value", initial: new Date(2026, 9, 5), text: "Oct 5, 2026" },
  ])("shows the right text with $name", ({ initial, text }) => {
    render(<ControlledDateField initial={initial} />);
    expect(screen.getByRole("combobox", { name: "Start" })).toHaveTextContent(text);
  });

  it("opens on the picked day, then picks another and closes", () => {
    const onValueChange = jest.fn();
    render(<ControlledDateField initial={new Date(2026, 9, 5)} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Start" }));
    expect(screen.getByRole("button", { name: /October 5/ })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: /October 9/ }));
    expect(screen.getByRole("combobox", { name: "Start" })).toHaveTextContent("Oct 9, 2026");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledWith(new Date(2026, 9, 9));
  });

  it.each([
    { name: "marks a required field", required: true, marks: 1 },
    { name: "leaves an optional field unmarked", required: false, marks: 0 },
  ])("$name", ({ required, marks }) => {
    render(<ControlledDateField required={required} />);
    expect(screen.queryAllByText("*")).toHaveLength(marks);
  });

  it("flags an invalid value and points at the error", () => {
    render(
      <>
        <ControlledDateField aria-invalid aria-describedby="error" />
        <p id="error">Pick a date</p>
      </>,
    );
    const trigger = screen.getByRole("combobox", { name: "Start" });

    expect(trigger).toBeInvalid();
    expect(trigger).toHaveAccessibleDescription("Pick a date");
  });

  it("disables the trigger", () => {
    render(<ControlledDateField disabled />);
    expect(screen.getByRole("combobox", { name: "Start" })).toBeDisabled();
  });
});
