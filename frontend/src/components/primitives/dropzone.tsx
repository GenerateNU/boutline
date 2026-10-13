"use client";

import { cn } from "cn";
import { Upload } from "lucide-react";
import { type Accept, useDropzone } from "react-dropzone";

type DropzoneProps = {
  label: string;
  accept: Accept;
  onFile?: (file: File) => void;
  onReject?: (message: string) => void;
  className?: string;
};

function Dropzone({ label, accept, onFile, onReject, className }: DropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    onDropAccepted: ([file]) => onFile?.(file),
    onDropRejected: ([rejection]) => onReject?.(rejection.errors[0].message),
  });

  return (
    <div
      {...getRootProps({
        className: cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-foreground px-4 py-6 text-center text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          isDragActive && "bg-muted",
          className,
        ),
      })}
      data-slot="dropzone"
    >
      <input {...getInputProps()} />
      <Upload aria-hidden className="size-5" />
      <span>{label}</span>
    </div>
  );
}

export { Dropzone };
