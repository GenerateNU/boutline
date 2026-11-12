"use client";

import { cn } from "cn";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { type Accept, useDropzone } from "react-dropzone";

interface DropzoneProps {
  label?: string;
  accept: Accept;
  onFile?: (file: File) => void;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  maxSize?: number;
  onReject?: (message: string) => void;
  className?: string;
  children?: React.ReactNode | ((open: () => void) => React.ReactNode);
}

function Dropzone({
  label,
  accept,
  onFile,
  multiple = false,
  onFiles,
  maxSize,
  onReject,
  className,
  children,
}: DropzoneProps) {
  const triggered = typeof children === "function";
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept,
    multiple,
    maxSize,
    noClick: triggered,
    noKeyboard: triggered,
    onDropAccepted: (files) => (multiple ? onFiles?.(files) : onFile?.(files[0])),
    onDropRejected: ([rejection]) => onReject?.(rejection.errors[0].message),
  });

  return (
    <div
      {...getRootProps({
        className: cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-outline bg-background px-4 py-6 text-center text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-blue-lighter",
          !triggered && "cursor-pointer hover:bg-blue-lightest",
          isDragActive && "border-blue bg-blue-lightest",
          className,
        ),
      })}
      data-slot="dropzone"
    >
      <input {...getInputProps()} />
      {triggered
        ? children(open)
        : (children ?? (
            <>
              <CloudUploadOutlined aria-hidden className="size-5" />
              <p>{label}</p>
            </>
          ))}
    </div>
  );
}

export { Dropzone };
