import { fireEvent, render, screen } from "@testing-library/react";

import { TimeField } from "@/components/primitives/time-field";

beforeAll(() => {
  // jsdom lacks these; Radix calls them when opening and picking items.
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
});

describe("TimeField", () => {
  it.each([
    { name: "shows the placeholder with no value", value: "", text: "Select time" },
    { name: "shows a value on the clock", value: "13:30", text: "1:30 PM" },
    { name: "shows a value off the 15-minute grid", value: "09:07", text: "9:07 AM" },
  ])("$name", ({ value, text }) => {
    render(<TimeField label="Time" value={value} onValueChange={jest.fn()} />);
    expect(screen.getByRole("combobox", { name: "Time" })).toHaveTextContent(text);
  });

  it.each([
    { name: "lists the day in 15-minute steps", value: "", options: 96 },
    { name: "adds an off-grid value to the list", value: "09:07", options: 97 },
  ])("$name", ({ value, options }) => {
    render(<TimeField label="Time" value={value} onValueChange={jest.fn()} />);

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Time" }), { key: "Enter" });

    expect(screen.getAllByRole("option")).toHaveLength(options);
  });

  it("picks a time as HH:mm", () => {
    const onValueChange = jest.fn();
    render(<TimeField label="Time" value="" onValueChange={onValueChange} />);

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Time" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "8:45 AM" }));

    expect(onValueChange).toHaveBeenCalledWith("08:45");
  });
});
