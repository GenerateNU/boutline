"use client";

import { CloudUpload, File as FileIcon, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { Dialog } from "radix-ui";
import type { Accept } from "react-dropzone";

import { Button } from "@/components/primitives/button";
import { Dropzone } from "@/components/primitives/dropzone";
import { LinearProgress } from "@/components/primitives/linear-progress";
import { ModalClose } from "@/components/primitives/modal";

interface UploadFile {
  id: string;
  file: File;
  progress?: number;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: UploadFile[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onReject?: (message: string) => void;
  accept?: Accept;
  maxSize?: number;
}

const uploadAccept: Accept = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"],
  "video/mp4": [".mp4"],
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface UploadFileRowProps {
  item: UploadFile;
  onRemove: () => void;
}

function UploadFileRow({ item, onRemove }: UploadFileRowProps) {
  const { file, progress } = item;
  const uploading = progress !== undefined && progress < 100;
  const extension = file.name.split(".").pop()?.toUpperCase() ?? "";

  return (
    <li className="flex items-center gap-3 rounded-lg bg-blue-lightest p-3">
      <div className="relative shrink-0">
        <FileIcon aria-hidden className="size-8 text-neutral-secondary" />
        <p className="absolute bottom-1 left-0 rounded-xs bg-red-dark px-0.5 text-[8px] leading-tight font-bold text-white">
          {extension}
        </p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-obsidian">{file.name}</p>
        {uploading ? (
          <>
            <p className="flex items-center gap-1 text-xs text-neutral-secondary">
              <LoaderCircle aria-hidden className="size-3 animate-spin" />
              Uploading...
            </p>
            <LinearProgress value={progress} className="bg-outline [&>*]:bg-blue" />
          </>
        ) : (
          <p className="text-xs text-neutral-muted">{formatSize(file.size)}</p>
        )}
      </div>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label={`Remove ${file.name}`}
        className="size-8 text-neutral-secondary"
        onClick={onRemove}
      >
        <X aria-hidden />
      </Button>
    </li>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  files,
  onAddFiles,
  onRemoveFile,
  onReject,
  accept = uploadAccept,
  maxSize = 50 * 1024 * 1024,
}: UploadDialogProps) {
  const [rejection, setRejection] = useState<string>();

  // Without an onReject handler the message is shown inline instead.
  const handleReject = onReject ?? setRejection;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-obsidian/40" />
        <Dialog.Content
          data-slot="upload-dialog"
          className="fixed top-1/2 left-1/2 flex max-h-dvh w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-2xl bg-background p-6 font-satoshi">
          <div className="flex items-start gap-3 border-b border-outline pb-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-outline">
              <CloudUpload aria-hidden className="size-5 text-obsidian" />
            </div>
            <div className="flex-1">
              <Dialog.Title className="text-base font-semibold text-obsidian">
                Upload files
              </Dialog.Title>
              <Dialog.Description className="text-sm text-neutral-muted">
                Select and upload the files of your choice
              </Dialog.Description>
            </div>
            <ModalClose />
          </div>

          <Dropzone
            multiple
            accept={accept}
            maxSize={maxSize}
            onFiles={(added) => {
              setRejection(undefined);
              onAddFiles(added);
            }}
            onReject={handleReject}
            className="gap-3 py-8"
          >
            {(browse) => (
              <>
                <CloudUpload aria-hidden className="size-8 text-neutral-secondary" />
                <p className="text-base font-semibold text-obsidian">
                  Choose a file or drag &amp; drop it here
                </p>
                <p className="text-xs text-neutral-muted">
                  JPEG, PNG, PDF, and MP4 formats, up to 50MB
                </p>
                <Button type="button" variant="outline" onClick={browse}>
                  Browse File
                </Button>
              </>
            )}
          </Dropzone>

          {rejection && (
            <p role="alert" className="text-sm text-red-dark">
              {rejection}
            </p>
          )}

          {files.length > 0 && (
            <ul className="flex flex-col gap-2">
              {files.map((item) => (
                <UploadFileRow key={item.id} item={item} onRemove={() => onRemoveFile(item.id)} />
              ))}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { UploadDialog, uploadAccept, type UploadFile };
