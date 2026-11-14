import { fireEvent, render, screen } from "@testing-library/react";

import { ImportDropzone } from "@/features/tournament/components/import-dropzone";

describe("ImportDropzone", () => {
  it("shows the sample CSV in a dialog without leaving the page", () => {
    render(<ImportDropzone />);

    expect(screen.getByText("Only .csv files are accepted.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View sample CSV" }));

    expect(screen.getByRole("dialog", { name: "Sample CSV" })).toHaveTextContent(
      "Last Name,First Name,Member #,Club",
    );
  });
});
