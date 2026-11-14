import { render, screen } from "@testing-library/react";

import { ImportDropzone } from "@/components/primitives/import-dropzone";

const CSV = { "text/csv": [".csv"] };

describe("ImportDropzone", () => {
  it.each([
    { name: "the default title alone", props: {}, want: ["Already have file?"], notWant: ["Only CSV"] },
    {
      name: "a custom title, hint and extra action",
      props: { title: "Import fencers", hint: "Only CSV", children: <a href="/sample">Sample</a> },
      want: ["Import fencers", "Only CSV", "Sample"],
      notWant: ["Already have file?"],
    },
  ])("renders $name", ({ props, want, notWant }) => {
    render(<ImportDropzone accept={CSV} {...props} />);

    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
    want.forEach((text) => expect(screen.getByText(text)).toBeInTheDocument());
    notWant.forEach((text) => expect(screen.queryByText(text)).not.toBeInTheDocument());
  });

  it("limits the file picker to the accepted types", () => {
    const { container } = render(<ImportDropzone accept={CSV} />);

    expect(container.querySelector('input[type="file"]')).toHaveAttribute("accept", "text/csv,.csv");
  });
});
