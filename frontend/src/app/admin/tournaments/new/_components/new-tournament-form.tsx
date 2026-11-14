"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/primitives/button";
import { ImportDropzone } from "@/features/tournament/components/import-dropzone";
import { parseCompetitorImport } from "@/lib/competitor-import/parse-competitor-import";
import { pluralize } from "@/lib/pluralize";
import { errorMessage } from "@/utils/error-message";

import { useTournamentDraft } from "../_hooks/use-tournament-draft";
import { eventTitle, missingEventFields, missingFencerFields } from "../tournament-draft-helpers";
import { EventDraftCard } from "./event-draft-card";
import { TournamentDetailsCard } from "./tournament-details-card";

interface ImportResult {
  message: string;
  failed: boolean;
}

function NewTournamentForm() {
  const router = useRouter();
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
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

  // One column on phones (tournament, events, submit). On a laptop the events
  // move to a right column spanning both rows, so submit sits under the
  // tournament; the 1fr second row keeps it there however tall the events get.
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-10 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-6"
    >
      <div className="flex flex-col gap-4">
        <ImportDropzone onFile={handleFile} />
        {importResult ? (
          <p
            role={importResult.failed ? "alert" : "status"}
            className={importResult.failed ? "text-xs text-red-dark" : "text-xs text-neutral-secondary"}
          >
            {importResult.message}
          </p>
        ) : null}
        <TournamentDetailsCard draft={draft} onField={setField} onSavedChange={setTournamentSaved} />
      </div>

      <section aria-labelledby="events-heading" className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
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
