"use client";

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
  // Extra actions under the hint, such as a link to a sample file.
  children?: React.ReactNode;
}

function ImportDropzone({ accept, title = "Already have file?", hint, onFile, children }: ImportDropzoneProps) {
  return (
    <Dropzone accept={accept} onFile={onFile} className="gap-3 px-6 py-8">
      {(open) => (
        <>
          <CloudUploadOutlined aria-hidden className="size-8 text-neutral-secondary" />
          <p className="text-base font-semibold text-obsidian">{title}</p>
          <Button type="button" className="w-full" onClick={open}>
            Upload
          </Button>
          {hint || children ? (
            <div className="flex flex-col items-center">
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
