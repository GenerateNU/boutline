import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { UploadDialog, type UploadFile } from "@/components/primitives/upload-dialog";

const PDF = new File(["a"], "my-cv.pdf", { type: "application/pdf" });
const PNG = new File(["b"], "photo.png", { type: "image/png" });

function renderDialog(props: Partial<React.ComponentProps<typeof UploadDialog>> = {}) {
  const handlers = { onAddFiles: jest.fn(), onRemoveFile: jest.fn(), onOpenChange: jest.fn() };
  render(<UploadDialog open files={[]} {...handlers} {...props} />);
  return handlers;
}

function fileInput() {
  return document.querySelector<HTMLInputElement>("input[type=file]")!;
}

describe("UploadDialog", () => {
  it("renders the static copy and browse button", () => {
    renderDialog();
    expect(screen.getByText("Upload files")).toBeInTheDocument();
    expect(screen.getByText("Select and upload the files of your choice")).toBeInTheDocument();
    expect(screen.getByText("JPEG, PNG, PDF, and MP4 formats, up to 50MB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse File" })).toBeInTheDocument();
  });

  it("removes a file by id", () => {
    const files: UploadFile[] = [
      { id: "1", file: PDF },
      { id: "2", file: PNG },
    ];
    const { onRemoveFile } = renderDialog({ files });
    expect(screen.getByText("my-cv.pdf")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove photo.png" }));
    expect(onRemoveFile).toHaveBeenCalledWith("2");
  });

  it.each([
    { progress: 40, uploading: true },
    { progress: undefined, uploading: false },
    { progress: 100, uploading: false },
  ])("progress $progress shows uploading=$uploading", ({ progress, uploading }) => {
    renderDialog({ files: [{ id: "1", file: PDF, progress }] });
    expect(!!screen.queryByText("Uploading...")).toBe(uploading);
    expect(!!screen.queryByRole("progressbar")).toBe(uploading);
  });

  it("adds accepted files", async () => {
    const { onAddFiles } = renderDialog();
    fireEvent.change(fileInput(), { target: { files: [PDF] } });
    await waitFor(() => expect(onAddFiles).toHaveBeenCalledWith([PDF]));
  });

  it("rejects wrong types inline when no onReject is given", async () => {
    const { onAddFiles } = renderDialog();
    const txt = new File(["x"], "a.txt", { type: "text/plain" });
    fireEvent.change(fileInput(), { target: { files: [txt] } });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onAddFiles).not.toHaveBeenCalled();
  });

  it("reports oversize files through onReject", async () => {
    const onReject = jest.fn();
    const { onAddFiles } = renderDialog({ onReject, maxSize: 1 });
    fireEvent.change(fileInput(), {
      target: { files: [new File(["too big"], "big.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() => expect(onReject).toHaveBeenCalled());
    expect(onAddFiles).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
