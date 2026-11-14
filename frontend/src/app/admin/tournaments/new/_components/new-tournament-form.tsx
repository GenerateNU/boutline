"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/primitives/button";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { ImportDropzone } from "@/features/tournament/components/import-dropzone";
import { parseCompetitorImport } from "@/lib/competitor-import/parse-competitor-import";
import { pluralize } from "@/lib/pluralize";
import { errorMessage } from "@/utils/error-message";

import { useTournamentDraft } from "../_hooks/use-tournament-draft";
import { EventDraftCard } from "./event-draft-card";

const AUTHORITIES = ["askFRED", "USA Fencing", "FIE", "Other"];

interface ImportResult {
  message: string;
  failed: boolean;
}

function NewTournamentForm() {
  const router = useRouter();
  const { draft, setField, addEvent, updateEvent, removeEvent, importRows, clear } = useTournamentDraft();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const latestUpload = useRef(0);

  // Parses an uploaded CSV and sorts its fencers into event cards. A file that
  // finishes parsing after a newer upload started is dropped, so it can't
  // overwrite the newer one.
  async function handleFile(file: File) {
    const upload = ++latestUpload.current;
    try {
      const { rows } = await parseCompetitorImport(file);
      if (upload !== latestUpload.current) {
        return;
      }
      importRows(rows);
      const added = rows.filter((row) => row.status === "valid").length;
      const skipped = rows.length - added;
      const skippedNote = skipped > 0 ? `, skipped ${skipped} invalid or duplicate ${pluralize(skipped, "row")}` : "";
      setImportResult({ message: `Added ${added} ${pluralize(added, "fencer")}${skippedNote}.`, failed: false });
    } catch (error) {
      if (upload === latestUpload.current) {
        setImportResult({ message: `Couldn't read ${file.name}: ${errorMessage(error)}`, failed: true });
      }
    }
  }

  // Submitting doesn't save anything yet (#252), so it only clears the draft.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clear();
    router.push("/admin/tournaments");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ImportDropzone onFile={handleFile} />
      {importResult ? (
        <p
          role={importResult.failed ? "alert" : "status"}
          className={importResult.failed ? "text-xs text-red-dark" : "text-xs text-neutral-secondary"}
        >
          {importResult.message}
        </p>
      ) : null}

      <TextField
        label="Name of tournament"
        className="mt-3"
        value={draft.name}
        onChange={(change) => setField("name", change.target.value)}
        required
      />
      <TextField
        label="Location"
        placeholder="City, State"
        value={draft.location}
        onChange={(change) => setField("location", change.target.value)}
        required
      />
      <TextField
        label="Venue"
        value={draft.venue}
        onChange={(change) => setField("venue", change.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Date"
          type="date"
          value={draft.date}
          onChange={(change) => setField("date", change.target.value)}
          required
        />
        <TextField
          label="Time"
          type="time"
          value={draft.time}
          onChange={(change) => setField("time", change.target.value)}
          required
        />
      </div>
      <SelectField
        label="Authority"
        options={AUTHORITIES}
        value={draft.authority}
        onValueChange={(authority) => setField("authority", authority)}
        required
      />

      <h2 className="mt-6 text-lg font-semibold text-obsidian">Events</h2>
      {draft.events.map((event, index) => (
        <EventDraftCard
          key={event.id}
          event={event}
          number={index + 1}
          onChange={(patch) => updateEvent(event.id, patch)}
          onRemove={draft.events.length > 1 ? () => removeEvent(event.id) : undefined}
        />
      ))}
      <Button type="button" variant="outline" className="h-12 rounded-full" onClick={addEvent}>
        <AddOutlined aria-hidden />
        Add event
      </Button>

      <Button type="submit" variant="filled" className="mt-6 h-12 rounded-full">
        Create tournament
      </Button>
    </form>
  );
}

export { NewTournamentForm };
