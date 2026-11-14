"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/primitives/button";
import { ImportDropzone } from "@/components/primitives/import-dropzone";
import { useToast } from "@/components/primitives/toast";
import { parseCompetitorImport } from "@/lib/competitor-import/parse-competitor-import";
import { pluralize } from "@/lib/pluralize";
import { errorMessage } from "@/utils/error-message";

import { useTournamentDraft } from "../_hooks/use-tournament-draft";
import { eventTitle, importedEventCount, missingEventFields, missingFencerFields } from "../tournament-draft-helpers";
import { CsvSampleButton } from "./csv-sample-button";
import { EventDraftCard } from "./event-draft-card";
import { TournamentDetailsCard } from "./tournament-details-card";

// The parser reads CSV only.
const CSV_ACCEPT = { "text/csv": [".csv"] };

function NewTournamentForm() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    draft,
    setField,
    setTournamentSaved,
    addEvent,
    updateEvent,
    removeEvent,
    addFencer,
    updateFencer,
    removeFencer,
    importRows,
    clear,
  } = useTournamentDraft();
  const [importError, setImportError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const latestUpload = useRef(0);

  // Parses an uploaded CSV, sorts its fencers into event cards, and toasts what
  // it filled in. A file that finishes parsing after a newer upload started is
  // dropped, so it can't overwrite the newer one. A file that can't be read gets
  // an inline error instead, since a toast would vanish before it's fixed.
  async function handleFile(file: File) {
    const upload = ++latestUpload.current;
    try {
      const { rows } = await parseCompetitorImport(file);
      if (upload !== latestUpload.current) {
        return;
      }
      importRows(rows);
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

  function setExpanded(ids: string[], expanded: boolean) {
    setCollapsed((current) => {
      const next = new Set(current);
      ids.forEach((id) => (expanded ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  // The browser only checks fields on the page, and a collapsed card's aren't,
  // so unsaved cards are checked here and reopened if they're missing anything.
  // Saved cards were checked when saved. Submitting doesn't save anything yet
  // (#252), so it only clears the draft.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const incomplete = draft.events
      .map((draftEvent, index) => ({ draftEvent, title: eventTitle(draftEvent, index) }))
      .filter(({ draftEvent }) => {
        const hasMissingFields = missingEventFields(draftEvent).length > 0;
        const hasIncompleteFencers = draftEvent.fencers.some((fencer) => missingFencerFields(fencer).length > 0);
        return !draftEvent.saved && (hasMissingFields || hasIncompleteFencers);
      });
    if (incomplete.length > 0) {
      setExpanded(incomplete.map(({ draftEvent }) => draftEvent.id), true);
      setSubmitError(`Finish ${incomplete.map(({ title }) => title).join(", ")} before creating the tournament.`);
      return;
    }
    clear();
    router.push("/admin/tournaments");
  }

  // One column on phones (upload, tournament, events, submit). On a laptop the
  // upload spans both columns, then events sit in a right column beside the
  // tournament and submit; the 1fr last row keeps submit right under the
  // tournament however tall the events get.
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-10"
    >
      <div className="flex flex-col gap-4 lg:col-span-2">
        <ImportDropzone accept={CSV_ACCEPT} hint="Only .csv files are accepted." onFile={handleFile}>
          <CsvSampleButton />
        </ImportDropzone>
        {importError ? (
          <p role="alert" className="text-xs text-red-dark">
            {importError}
          </p>
        ) : null}
      </div>

      <div className="lg:col-start-1">
        <TournamentDetailsCard draft={draft} onField={setField} onSavedChange={setTournamentSaved} />
      </div>

      <section aria-labelledby="events-heading" className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-2">
        <h2 id="events-heading" className="text-lg font-semibold text-obsidian">
          Events
        </h2>
        {draft.events.map((event, index) => (
          <EventDraftCard
            key={event.id}
            event={event}
            title={eventTitle(event, index)}
            expanded={!collapsed.has(event.id)}
            tournamentSaved={draft.saved}
            onExpandedChange={(expanded) => setExpanded([event.id], expanded)}
            onChange={(patch) => updateEvent(event.id, patch)}
            onRemove={draft.events.length > 1 ? () => removeEvent(event.id) : undefined}
            onAddFencer={() => addFencer(event.id)}
            onChangeFencer={(fencerId, patch) => updateFencer(event.id, fencerId, patch)}
            onRemoveFencer={(fencerId) => removeFencer(event.id, fencerId)}
          />
        ))}
        <Button type="button" variant="outline" className="h-12 rounded-full" onClick={addEvent}>
          <AddOutlined aria-hidden />
          Add event
        </Button>
      </section>

      <div className="flex flex-col gap-2 lg:col-start-1">
        {submitError ? (
          <p role="alert" className="text-xs text-red-dark">
            {submitError}
          </p>
        ) : null}
        <Button type="submit" variant="filled" className="h-12 rounded-full">
          Create tournament
        </Button>
      </div>
    </form>
  );
}

export { NewTournamentForm };
