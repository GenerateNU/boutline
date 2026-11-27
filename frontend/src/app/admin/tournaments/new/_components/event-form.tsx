"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/primitives/button";
import { Text } from "@/components/primitives/text";

import { useDraftSaving } from "../_hooks/use-draft-saving";
import { useTournamentDraft } from "../_hooks/use-tournament-draft";
import { EventDraft } from "../_types/tournament-draft";
import { missingEventFields, newEventDraft } from "../tournament-draft-helpers";
import { EventDraftFields } from "./event-draft-fields";

const FORM_PATH = "/admin/tournaments/new";

const subscribe = () => () => {};

// The fields Clear All empties; ids, fencers and save state stay.
function blankEventFields(): Partial<EventDraft> {
  const { name, type, date, time, weapon, genderMix, ageCategory, ratingLevel, format, qualifier } = newEventDraft();
  return { name, type, date, time, weapon, genderMix, ageCategory, ratingLevel, format, qualifier };
}

interface EventFormProps {
  // The draft event's local id, from Add Events or a card's edit pencil.
  eventId: string;
}

// Edits one event of the creation draft in place; nothing is sent to the server
// until Continue on the tournament form.
function EventForm({ eventId }: EventFormProps) {
  const router = useRouter();
  // The draft lives in sessionStorage, which the server render can't see; waiting
  // for hydration keeps "isn't in the draft" from flashing before it loads.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const { draft, setTournamentId, setTournamentSaved, updateEvent, updateEventWith, removeEvent } = useTournamentDraft();
  const { removingEvents, errors, removeEventCard } = useDraftSaving({
    draft,
    setTournamentId,
    setTournamentSaved,
    updateEventWith,
    removeEvent,
  });
  const [attempted, setAttempted] = useState(false);
  const event = draft.events.find((draftEvent) => draftEvent.id === eventId);

  if (!hydrated) {
    return null;
  }
  if (!event) {
    return (
      <Text variant="muted">
        This event isn&apos;t in the tournament draft any more.{" "}
        <Link href={FORM_PATH} className="text-blue underline">
          Back to the tournament
        </Link>
      </Text>
    );
  }

  // An event sent by an earlier, partly failed Continue is sent again once edited.
  function handleChange(patch: Partial<EventDraft>) {
    updateEvent(eventId, { ...patch, saved: false });
  }

  function handleClear() {
    handleChange(blankEventFields());
    setAttempted(false);
  }

  async function handleRemove() {
    if (await removeEventCard(eventId)) {
      router.push(FORM_PATH);
    }
  }

  function handleContinue(submit: React.FormEvent<HTMLFormElement>) {
    submit.preventDefault();
    if (event && missingEventFields(event).length > 0) {
      setAttempted(true);
      return;
    }
    router.push(FORM_PATH);
  }

  const removing = removingEvents.has(eventId);
  const eventErrors = errors.events[eventId] ?? [];

  return (
    <form onSubmit={handleContinue} className="flex flex-col gap-6">
      <fieldset disabled={removing} className="flex min-w-0 flex-col gap-6">
        <EventDraftFields event={event} attempted={attempted} onChange={handleChange} />
      </fieldset>

      <div className="flex flex-col gap-3">
        {eventErrors.length > 0 ? (
          <ul role="alert" className="flex flex-col gap-1 text-xs text-red-dark">
            {eventErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
        <Button type="button" variant="tonal" className="w-full" disabled={removing} onClick={handleClear}>
          Clear All
        </Button>
        <Button type="submit" className="w-full" disabled={removing}>
          Continue
        </Button>
        <Button type="button" variant="text" className="w-full text-red-dark" disabled={removing} onClick={handleRemove}>
          {removing ? "Removing…" : "Remove event"}
        </Button>
      </div>
    </form>
  );
}

export { EventForm };
