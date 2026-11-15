import { fireEvent, render, screen } from "@testing-library/react";

import { CsvSampleButton } from "./csv-sample-button";

describe("CsvSampleButton", () => {
  it("shows the sample CSV in a dialog without leaving the page", () => {
    render(<CsvSampleButton />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View sample CSV" }));

    expect(screen.getByRole("dialog", { name: "Sample CSV" })).toHaveTextContent("Last Name,First Name,Member #,Club");
  });

  it("offers the sample as a CSV file download", () => {
    render(<CsvSampleButton />);
    fireEvent.click(screen.getByRole("button", { name: "View sample CSV" }));

    const link = screen.getByRole("link", { name: "Download Sample CSV" });

    expect(link).toHaveAttribute("download", "sample-competitors.csv");
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toMatch(
      /^data:text\/csv;charset=utf-8,Last Name,First Name,Member #,Club/,
    );
  });
});
