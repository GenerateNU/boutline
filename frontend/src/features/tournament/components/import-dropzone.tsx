"use client";

import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Dropzone } from "@/components/primitives/dropzone";
import { CsvSampleDialog } from "@/features/tournament/components/csv-sample-dialog";

const IMPORT_ACCEPT = { "text/csv": [".csv"] };

interface ImportDropzoneProps {
  onFile?: (file: File) => void;
}

function ImportDropzone({ onFile }: ImportDropzoneProps) {
  const [sampleOpen, setSampleOpen] = useState(false);

  return (
    <>
      <Dropzone accept={IMPORT_ACCEPT} onFile={onFile} className="gap-3 px-6 py-8">
        {(open) => (
          <>
            <CloudUploadOutlined aria-hidden className="size-8 text-neutral-secondary" />
            <p className="text-base font-semibold text-obsidian">Already have file?</p>
            <Button type="button" className="w-full" onClick={open}>
              Upload
            </Button>
            <div className="flex flex-col items-center">
              <p className="text-xs text-neutral-secondary">Only .csv files are accepted.</p>
              <Button
                type="button"
                variant="text"
                size="sm"
                className="h-auto py-1"
                onClick={() => setSampleOpen(true)}
              >
                View sample CSV
              </Button>
            </div>
          </>
        )}
      </Dropzone>
      <CsvSampleDialog open={sampleOpen} onOpenChange={setSampleOpen} />
    </>
  );
}

export { ImportDropzone };
