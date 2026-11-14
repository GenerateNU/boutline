"use client";

import { cn } from "cn";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { Accept } from "react-dropzone";

import { Button } from "@/components/primitives/button";
import { Dropzone } from "@/components/primitives/dropzone";

interface ImportDropzoneProps {
  accept: Accept;
  title?: string;
  // Under the Upload button, e.g. which files are accepted.
  hint?: React.ReactNode;
  onFile?: (file: File) => void;
  // A file the dropzone turned away, e.g. the wrong type or too large.
  onReject?: (message: string) => void;
  // Extra actions under the hint, such as a link to a sample file.
  children?: React.ReactNode;
  className?: string;
}

// A dropzone with a title and an Upload button, for importing one file.
function ImportDropzone({
  accept,
  title = "Already have file?",
  hint,
  onFile,
  onReject,
  children,
  className,
}: ImportDropzoneProps) {
  return (
    <Dropzone accept={accept} onFile={onFile} onReject={onReject} className={cn("gap-3 px-6 py-8", className)}>
      {(open) => (
        <>
          <CloudUploadOutlined aria-hidden className="size-8 text-neutral-secondary" />
          <p className="text-base font-semibold text-obsidian">{title}</p>
          <Button type="button" className="w-full max-w-xs" onClick={open}>
            Upload
          </Button>
          {hint || children ? (
            <div data-slot="import-dropzone-footer" className="flex flex-col items-center">
              {hint ? <p className="text-xs text-neutral-secondary">{hint}</p> : null}
              {children}
            </div>
          ) : null}
        </>
      )}
    </Dropzone>
  );
}

export { ImportDropzone };
