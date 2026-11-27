"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/primitives/button";
import { Text } from "@/components/primitives/text";

import { useTournamentDraft } from "../_hooks/use-tournament-draft";
import { EventDraft } from "../_types/tournament-draft";
import { missingEventFields, newEventDraft } from "../tournament-draft-helpers";
import { EventFields } from "./event-fields";

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
  const { draft, updateEvent } = useTournamentDraft();
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

  function handleContinue(submit: React.FormEvent<HTMLFormElement>) {
    submit.preventDefault();
    if (event && missingEventFields(event).length > 0) {
      setAttempted(true);
      return;
    }
    router.push(FORM_PATH);
  }

  return (
    <form onSubmit={handleContinue} className="flex flex-col gap-6">
      <EventFields event={event} attempted={attempted} onChange={handleChange} />

      <div className="flex flex-col gap-3">
        <Button type="button" variant="tonal" className="w-full" onClick={handleClear}>
          Clear All
        </Button>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </div>
    </form>
  );
}

export { EventForm };
