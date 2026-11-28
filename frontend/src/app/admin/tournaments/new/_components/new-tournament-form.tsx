"use client";

import EditOutlined from "@mui/icons-material/EditOutlined";
import { cn } from "cn";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/primitives/button";
import { Card, CardTitle } from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/primitives/collapsible";
import { Text } from "@/components/primitives/text";

import { useDraftSaving } from "../_hooks/use-draft-saving";
import { useTournamentDraft } from "../_hooks/use-tournament-draft";
import {
  eventTitle,
  isBlankEvent,
  missingEventFields,
  missingTournamentFields,
  RequiredTournamentField,
} from "../tournament-draft-helpers";
import { SelectionBar } from "./selection-bar";
import { TournamentFields } from "./tournament-fields";

function eventPagePath(localId: string) {
  return `/admin/tournaments/new/event?id=${encodeURIComponent(localId)}`;
}

interface EventRowEdit {
  href: string;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}

interface EventRowProps {
  title: string;
  // Set in edit mode. Links ignore the disabled fieldset, so the form leaves it unset while saving.
  edit?: EventRowEdit;
  errors: string[];
}

function EventRow({ title, edit, errors }: EventRowProps) {
  return (
    <li className="flex flex-col gap-1">
      <Card orientation="horizontal" className="gap-2.5 py-3.5 pr-3">
        {edit ? (
          <Checkbox
            checked={edit.selected}
            aria-label={`Select ${title}`}
            onCheckedChange={(checked) => edit.onSelectedChange(checked === true)}
          />
        ) : null}
        <CardTitle className="min-w-0 flex-1 truncate text-sm font-medium text-obsidian uppercase">{title}</CardTitle>
        {edit ? (
          <Button asChild variant="text" size="icon" className="-my-2 size-8 text-neutral-secondary">
            <Link href={edit.href} aria-label={`Edit ${title}`}>
              <EditOutlined aria-hidden />
            </Link>
          </Button>
        ) : null}
      </Card>
      {errors.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-1 text-xs text-red-dark">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function NewTournamentForm() {
  const router = useRouter();
  const {
    draft,
    setField,
    setTournamentId,
    setTournamentSaved,
    addEvent,
    updateEventWith,
    removeEvent,
    clear,
    removeBlankEvents,
  } = useTournamentDraft();
  const eventsHeadingId = useId();
  const [attempted, setAttempted] = useState(false);
  const [editing, setEditing] = useState(false);
  // Local ids of the events checked in edit mode.
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const { tournamentSaving, savingEvents, removingEvents, errors, removeEventCard, saveUnsaved } = useDraftSaving({
    draft,
    setTournamentId,
    setTournamentSaved,
    updateEventWith,
    removeEvent,
  });
  const isSaving = tournamentSaving || savingEvents.size > 0 || removingEvents.size > 0;
  // A just-added event stays out of the list until something is filled in, so it can't
  // flash as "Event 1" while its page opens; removeBlankEvents drops it if it never is.
  const listedEvents = draft.events.filter((draftEvent) => !isBlankEvent(draftEvent));
  // Set once the tournament is created. The draft is cleared when the dashboard replaces
  // this page, not before, so the emptied fields never flash blank and invalid on screen.
  const created = useRef(false);

  useEffect(
    () => () => {
      if (created.current) {
        clear();
      }
    },
    [clear],
  );

  // An event added and left without anything filled in (Add Events, then Back) is
  // dropped when this page shows, so it can't block Continue with "Finish Event 1".
  useEffect(() => {
    removeBlankEvents();
  }, [removeBlankEvents]);

  // A tournament already sent by an earlier, partly failed Continue is sent again once edited.
  function handleField(field: RequiredTournamentField, value: string) {
    setField(field, value);
    if (draft.saved) {
      setTournamentSaved(false);
    }
  }

  function handleAddEvent() {
    router.push(eventPagePath(addEvent()));
  }

  function setEventSelected(localId: string, isSelected: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (isSelected) {
        next.add(localId);
      } else {
        next.delete(localId);
      }
      return next;
    });
  }

  function toggleEditing() {
    setEditing(!editing);
    setSelected(new Set());
  }

  // A removal that fails keeps its event, with the error under its card. Removing
  // every event also leaves edit mode, which has nothing left to edit.
  async function handleRemoveSelected() {
    const ids = [...selected];
    setSelected(new Set());
    if (ids.length === listedEvents.length) {
      setEditing(false);
    }
    await Promise.all(ids.map((localId) => removeEventCard(localId)));
  }

  function handleClear() {
    clear();
    setAttempted(false);
    setEditing(false);
    setSelected(new Set());
    setSubmitError(null);
    setSaveFailed(false);
  }

  // The browser's required check accepts a field of spaces, and events are filled in
  // on their own page, so both are checked here. Whatever isn't saved yet is then
  // sent, and the draft is cleared only once all of it is on the server.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveFailed(false);
    if (missingTournamentFields(draft).length > 0) {
      setAttempted(true);
      setSubmitError(null);
      return;
    }
    if (listedEvents.length === 0) {
      setSubmitError("Add at least one event before creating the tournament.");
      return;
    }
    const incomplete = listedEvents
      .map((draftEvent, index) => ({ draftEvent, title: eventTitle(draftEvent, index) }))
      .filter(({ draftEvent }) => !draftEvent.saved && missingEventFields(draftEvent).length > 0);
    if (incomplete.length > 0) {
      setSubmitError(`Finish ${incomplete.map(({ title }) => title).join(", ")} before creating the tournament.`);
      return;
    }
    setSubmitError(null);
    const tournamentId = await saveUnsaved();
    if (!tournamentId) {
      setSaveFailed(true);
      return;
    }
    created.current = true;
    router.push(`/admin/tournaments/${tournamentId}`);
  }

  // Derived from the save errors, so it goes away once a retry fixes them.
  function saveFailureMessage() {
    if (errors.tournament) {
      return `Couldn't save the tournament details: ${errors.tournament}`;
    }
    const failedTitles = listedEvents
      .map((draftEvent, index) => ({ id: draftEvent.id, title: eventTitle(draftEvent, index) }))
      .filter(({ id }) => errors.events[id])
      .map(({ title }) => title);
    return failedTitles.length > 0
      ? `Couldn't save ${failedTitles.join(", ")}. Fix the errors under each event and try again.`
      : null;
  }

  const submitMessage = saveFailed ? saveFailureMessage() : submitError;

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", editing && selected.size > 0 && "pb-36")}>
      <fieldset disabled={isSaving} className="flex min-w-0 flex-col gap-6">
        <TournamentFields draft={draft} onField={handleField} attempted={attempted} />

        <Collapsible defaultOpen>
          <div className="relative flex items-center justify-between">
            <Text as="h2" id={eventsHeadingId} variant="title" className="text-lg font-medium text-obsidian">
              Create Events
            </Text>
            {/* A button can't hold the heading, so the trigger is the chevron and its
                ::after stretches over the header to keep the whole row clickable. */}
            <CollapsibleTrigger
              aria-labelledby={eventsHeadingId}
              className="group/trigger flex shrink-0 cursor-pointer items-center outline-none after:absolute after:-inset-2 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              <ExpandMoreOutlined
                aria-hidden
                className="size-5 text-neutral-secondary transition-transform group-data-[state=open]/trigger:rotate-180"
              />
            </CollapsibleTrigger>
          </div>
          {/* The negative margin and matching padding leave room for focus rings,
              which the animation's overflow-hidden would otherwise clip. */}
          <CollapsibleContent className="-mx-1 -mb-1 px-1 pb-1">
            <div className="flex flex-col gap-3 pt-3">
              <div className="flex gap-2">
                {editing ? null : (
                  <Button type="button" size="sm" onClick={handleAddEvent}>
                    Add Events
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={editing ? "filled" : "outline"}
                  disabled={listedEvents.length === 0}
                  onClick={toggleEditing}
                >
                  {editing ? "Exit Edit Mode" : "Edit Mode"}
                </Button>
              </div>
              <ul aria-label="Events" className="flex flex-col gap-3">
                {listedEvents.map((draftEvent, index) => (
                  <EventRow
                    key={draftEvent.id}
                    title={eventTitle(draftEvent, index)}
                    edit={
                      editing && !isSaving
                        ? {
                            href: eventPagePath(draftEvent.id),
                            selected: selected.has(draftEvent.id),
                            onSelectedChange: (isSelected) => setEventSelected(draftEvent.id, isSelected),
                          }
                        : undefined
                    }
                    errors={errors.events[draftEvent.id] ?? []}
                  />
                ))}
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </fieldset>

      <div className="flex flex-col gap-3">
        {submitMessage ? (
          <p role="alert" className="text-xs text-red-dark">
            {submitMessage}
          </p>
        ) : null}
        <Button type="button" variant="tonal" className="w-full" disabled={isSaving} onClick={handleClear}>
          Clear All
        </Button>
        <Button type="submit" className="w-full" disabled={isSaving}>
          Continue
        </Button>
      </div>

      {editing && selected.size > 0 ? (
        <SelectionBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button type="button" variant="outline" disabled={isSaving} onClick={handleRemoveSelected}>
            Remove
          </Button>
        </SelectionBar>
      ) : null}
    </form>
  );
}

export { NewTournamentForm };
