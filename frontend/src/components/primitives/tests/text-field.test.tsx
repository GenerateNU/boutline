import { render, screen } from "@testing-library/react";

import { TextField } from "@/components/primitives/text-field";

describe("TextField", () => {
  it.each([
    { name: "marks a required field", required: true, marks: 1 },
    { name: "leaves an optional field unmarked", required: false, marks: 0 },
  ])("$name", ({ required, marks }) => {
    render(<TextField label="Venue" required={required} />);

    expect(screen.getByRole("textbox", { name: "Venue" })).toBeInTheDocument();
    expect(screen.queryAllByText("*")).toHaveLength(marks);
  });
});
