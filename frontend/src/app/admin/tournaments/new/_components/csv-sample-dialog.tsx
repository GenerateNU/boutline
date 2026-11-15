"use client";

import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";

import { Button } from "@/components/primitives/button";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { EXAMPLE_COMPETITOR_IMPORT } from "@/lib/competitor-import/example-competitor-import";

// A data URI rather than a Blob URL, so there is no object URL to create and revoke.
const SAMPLE_CSV_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(EXAMPLE_COMPETITOR_IMPORT)}`;

interface CsvSampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CsvSampleDialog({ open, onOpenChange }: CsvSampleDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Sample CSV"
      description="A header row, then one fencer per row. Column names can be in any order or case."
      className="sm:max-w-3xl"
    >
      <pre className="max-h-80 overflow-auto rounded-md bg-surface p-3 font-mono text-xs text-obsidian">
        {EXAMPLE_COMPETITOR_IMPORT}
      </pre>
      <ModalFooter className="grid-cols-1">
        <Button asChild>
          <a href={SAMPLE_CSV_HREF} download="sample-competitors.csv">
            <FileDownloadOutlined aria-hidden />
            Download Sample CSV
          </a>
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { CsvSampleDialog };
