import { fireEvent, render, waitFor } from "@testing-library/react";

import { Dropzone } from "@/components/primitives/dropzone";

const MEGABYTE = 1024 * 1024;

// Sizes this big would be slow to allocate, so the file reports a size instead.
function pdfOfSize(bytes: number) {
  const file = new File(["x"], "report.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

describe("Dropzone", () => {
  it.each([
    { name: "accepts a file under 50MB by default", size: 49 * MEGABYTE, accepted: true },
    { name: "rejects a file over 50MB by default", size: 51 * MEGABYTE, accepted: false },
  ])("$name", async ({ size, accepted }) => {
    const onFile = jest.fn();
    const onReject = jest.fn();
    const { container } = render(
      <Dropzone accept={{ "application/pdf": [".pdf"] }} onFile={onFile} onReject={onReject} label="Upload" />,
    );

    fireEvent.change(container.querySelector("input[type=file]")!, {
      target: { files: [pdfOfSize(size)] },
    });

    await waitFor(() => expect(accepted ? onFile : onReject).toHaveBeenCalled());
    expect(accepted ? onReject : onFile).not.toHaveBeenCalled();
  });
});
