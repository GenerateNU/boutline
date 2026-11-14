import { fireEvent, render, screen } from "@testing-library/react";

import { CsvSampleButton } from "./csv-sample-button";

describe("CsvSampleButton", () => {
  it("shows the sample CSV in a dialog without leaving the page", () => {
    render(<CsvSampleButton />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View sample CSV" }));

    expect(screen.getByRole("dialog", { name: "Sample CSV" })).toHaveTextContent("Last Name,First Name,Member #,Club");
  });
});
