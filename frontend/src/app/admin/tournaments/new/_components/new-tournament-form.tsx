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

import { useDraftSaving } from "../_hooks/use-draft-saving";
import { useTournamentDraft } from "../_hooks/use-tournament-draft";
import {
  eventTitle,
  hasIncompleteFencers,
  importedEventCount,
  missingEventFields,
  missingTournamentFields,
} from "../tournament-draft-helpers";
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
    setTournamentId,
    setTournamentSaved,
    addEvent,
    updateEvent,
    updateEventWith,
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
  const [saveFailed, setSaveFailed] = useState(false);
  const { tournamentSaving, savingEvents, removingEvents, errors, saveTournament, saveEvent, removeEventCard, saveUnsaved } =
    useDraftSaving({ draft, setTournamentId, setTournamentSaved, updateEventWith, removeEvent });
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

  // A rejected file still supersedes any upload still parsing, so that one can't
  // finish later, apply an older file, and clear this error.
  function handleReject(message: string) {
    latestUpload.current++;
    setImportError(`Couldn't import that file: ${message}`);
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
  // Saved cards were checked when saved. Whatever isn't saved yet is then sent,
  // and the draft is cleared only once all of it is on the server.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveFailed(false);
    // The browser's required check accepts a field of spaces, so the tournament
    // is checked here too.
    if (missingTournamentFields(draft).length > 0) {
      setTournamentSaved(false);
      setSubmitError("Finish the tournament details before creating the tournament.");
      return;
    }
    const incomplete = draft.events
      .map((draftEvent, index) => ({ draftEvent, title: eventTitle(draftEvent, index) }))
      .filter(({ draftEvent }) => {
        const hasMissingFields = missingEventFields(draftEvent).length > 0;
        return !draftEvent.saved && (hasMissingFields || hasIncompleteFencers(draftEvent));
      });
    if (incomplete.length > 0) {
      setExpanded(incomplete.map(({ draftEvent }) => draftEvent.id), true);
      setSubmitError(`Finish ${incomplete.map(({ title }) => title).join(", ")} before creating the tournament.`);
      return;
    }
    setSubmitError(null);
    const tournamentId = await saveUnsaved();
    if (!tournamentId) {
      setSaveFailed(true);
      return;
    }
    clear();
    router.push(`/tournaments/${tournamentId}`);
  }

  // Derived from the cards' own errors, so it goes away once a retry fixes them.
  function saveFailureMessage() {
    if (errors.tournament) {
      return "Couldn't save the tournament details.";
    }
    const failedTitles = draft.events
      .map((draftEvent, index) => ({ id: draftEvent.id, title: eventTitle(draftEvent, index) }))
      .filter(({ id }) => errors.events[id])
      .map(({ title }) => title);
    return failedTitles.length > 0
      ? `Couldn't save ${failedTitles.join(", ")}. Fix the errors on the cards and try again.`
      : "Couldn't finish saving. Try again.";
  }

  const isSaving = tournamentSaving || savingEvents.size > 0 || removingEvents.size > 0;
  const submitMessage = saveFailed ? saveFailureMessage() : submitError;

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
        <ImportDropzone
          accept={CSV_ACCEPT}
          hint="Only .csv files are accepted."
          onFile={handleFile}
          onReject={handleReject}
        >
          <CsvSampleButton />
        </ImportDropzone>
        {importError ? (
          <p role="alert" className="text-xs text-red-dark">
            {importError}
          </p>
        ) : null}
      </div>

      <div className="lg:col-start-1">
        <TournamentDetailsCard
          draft={draft}
          onField={setField}
          onEdit={() => setTournamentSaved(false)}
          onSave={saveTournament}
          saving={tournamentSaving}
          error={errors.tournament}
        />
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
            tournamentId={draft.tournamentId}
            saving={savingEvents.has(event.id)}
            removing={removingEvents.has(event.id)}
            errors={errors.events[event.id] ?? []}
            onExpandedChange={(expanded) => setExpanded([event.id], expanded)}
            onChange={(patch) => updateEvent(event.id, patch)}
            onSave={async () => {
              if (draft.tournamentId) {
                await saveEvent(event.id, draft.tournamentId);
              }
            }}
            onRemove={draft.events.length > 1 ? () => removeEventCard(event.id) : undefined}
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
        {submitMessage ? (
          <p role="alert" className="text-xs text-red-dark">
            {submitMessage}
          </p>
        ) : null}
        <Button type="submit" variant="filled" className="h-12 rounded-full" disabled={isSaving}>
          Create tournament
        </Button>
      </div>
    </form>
  );
}

export { NewTournamentForm };
