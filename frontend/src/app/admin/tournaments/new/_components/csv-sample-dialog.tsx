"use client";

import { Modal } from "@/components/primitives/modal";
import { EXAMPLE_COMPETITOR_IMPORT } from "@/lib/competitor-import/example-competitor-import";

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
    </Modal>
  );
}

export { CsvSampleDialog };
