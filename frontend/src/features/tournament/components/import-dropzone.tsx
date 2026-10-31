"use client";

import { Button } from "@/components/primitives/button";
import { Dropzone } from "@/components/primitives/dropzone";

const importAccept = {
  "text/csv": [".csv"],
  "application/xml": [".xml"],
  "text/xml": [".xml"],
};

interface ImportDropzoneProps {
  onFile?: (file: File) => void;
}

function ImportDropzone({ onFile }: ImportDropzoneProps) {
  return (
    <Dropzone accept={importAccept} onFile={onFile} className="gap-5 rounded-2xl border-2 px-6 py-8">
      {(open) => (
        <>
          <p className="text-lg font-semibold">Already have file?</p>
          <Button type="button" className="w-full rounded-lg" onClick={open}>
            Upload
          </Button>
        </>
      )}
    </Dropzone>
  );
}

export { ImportDropzone };
