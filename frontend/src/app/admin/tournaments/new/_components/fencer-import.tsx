"use client";

import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import { useRef, useState } from "react";

import { ImportDropzone } from "@/components/primitives/import-dropzone";
import { useToast } from "@/components/primitives/toast";
import { parseCompetitorImport } from "@/lib/competitor-import/parse-competitor-import";
import { pluralize } from "@/lib/pluralize";
import { CompetitorImportRow } from "@/types/competitor-import";
import { errorMessage } from "@/utils/error-message";

import { importedEventCount } from "../tournament-draft-helpers";
import { CsvSampleButton } from "./csv-sample-button";

// The parser reads CSV only.
const CSV_ACCEPT = { "text/csv": [".csv"] };

interface FencerImportProps {
  onImport: (rows: CompetitorImportRow[]) => void;
  // Set while the draft is saving, since an import then would change what's being sent.
  disabled: boolean;
}

// Not rendered while adding fencers moves off the creation form (#348); kept so the
// new fencer page can reuse it.
function FencerImport({ onImport, disabled }: FencerImportProps) {
  const { toast } = useToast();
  const [importError, setImportError] = useState<string | null>(null);
  const latestUpload = useRef(0);

  // Parses an uploaded CSV, sorts its fencers into events, and toasts what it
  // filled in. A file that finishes parsing after a newer upload started is
  // dropped, so it can't overwrite the newer one. A file that can't be read gets
  // an inline error instead, since a toast would vanish before it's fixed.
  async function handleFile(file: File) {
    if (disabled) {
      setImportError("Wait for the save to finish before importing a file.");
      return;
    }
    const upload = ++latestUpload.current;
    try {
      const { rows } = await parseCompetitorImport(file);
      if (upload !== latestUpload.current) {
        return;
      }
      onImport(rows);
      setImportError(null);
      const fencers = rows.filter((row) => row.status === "valid").length;
      const events = importedEventCount(rows);
      const skipped = rows.length - fencers;
      const skippedNote = skipped > 0 ? ` Skipped ${skipped} invalid or duplicate ${pluralize(skipped, "row")}.` : "";
      toast({
        icon: <CheckCircleOutlined aria-hidden />,
        description: `Autofilled ${events} ${pluralize(events, "event")} and ${fencers} ${pluralize(fencers, "fencer")} from ${file.name}.${skippedNote}`,
      });
    } catch (error) {
      if (upload === latestUpload.current) {
        setImportError(`Couldn't read ${file.name}: ${errorMessage(error)}`);
      }
    }
  }

  // A rejected file still supersedes any upload still parsing, so that one can't
  // finish later, apply an older file, and clear this error.
  function handleReject(message: string) {
    latestUpload.current++;
    setImportError(`Couldn't import that file: ${message}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <ImportDropzone accept={CSV_ACCEPT} hint="Only .csv files are accepted." onFile={handleFile} onReject={handleReject}>
        <CsvSampleButton />
      </ImportDropzone>
      {importError ? (
        <p role="alert" className="text-xs text-red-dark">
          {importError}
        </p>
      ) : null}
    </div>
  );
}

export { FencerImport };
