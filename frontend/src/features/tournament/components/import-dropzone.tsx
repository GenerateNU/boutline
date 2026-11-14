"use client";

import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { Button } from "@/components/primitives/button";
import { Dropzone } from "@/components/primitives/dropzone";

const IMPORT_ACCEPT = {
  "text/csv": [".csv"],
  "application/xml": [".xml"],
  "text/xml": [".xml"],
};

interface ImportDropzoneProps {
  onFile?: (file: File) => void;
}

function ImportDropzone({ onFile }: ImportDropzoneProps) {
  return (
    <Dropzone accept={IMPORT_ACCEPT} onFile={onFile} className="gap-3 px-6 py-8">
      {(open) => (
        <>
          <CloudUploadOutlined aria-hidden className="size-8 text-neutral-secondary" />
          <p className="text-base font-semibold text-obsidian">Already have file?</p>
          <Button type="button" className="w-full" onClick={open}>
            Upload
          </Button>
        </>
      )}
    </Dropzone>
  );
}

export { ImportDropzone };
