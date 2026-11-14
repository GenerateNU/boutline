"use client";

import { useState } from "react";

import { Button } from "@/components/primitives/button";

import { CsvSampleDialog } from "./csv-sample-dialog";

function CsvSampleButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="text" size="sm" className="h-auto py-1" onClick={() => setOpen(true)}>
        View sample CSV
      </Button>
      <CsvSampleDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export { CsvSampleButton };
