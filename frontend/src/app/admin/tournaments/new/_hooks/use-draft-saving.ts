import { useRef, useState } from "react";

import { errorMessage } from "@/utils/error-message";

import {
  createCompetitor,
  createEvent,
  createTournament,
  deleteCompetitor,
  deleteEvent,
  updateCompetitor,
  updateEvent,
  updateTournament,
} from "../_services/tournament-setup-api";
import { EventDraft, FencerDraft, TournamentDraft } from "../_types/tournament-draft";
import { fencerChanges } from "../tournament-draft-helpers";
import { competitorRequest, eventRequest, tournamentRequest } from "../tournament-request-helpers";

const TOURNAMENT_KEY = "tournament";

const EVENT_FIELDS = [
  "name",
  "type",
  "date",
  "time",
  "weapon",
  "genderMix",
  "ageCategory",
  "ratingLevel",
  "format",
  "qualifier",
] as const;

interface DraftSavingOptions {
  draft: TournamentDraft;
  setTournamentId: (id: string) => void;
  setTournamentSaved: (saved: boolean) => void;
  updateEventWith: (id: string, update: (event: EventDraft) => EventDraft) => void;
  removeEvent: (id: string) => void;
}

interface SaveErrors {
  tournament: string | null;
  // Keyed by the event's local id; one line per thing that failed.
  events: Record<string, string[]>;
}

function withId(ids: ReadonlySet<string>, id: string, present: boolean) {
  const next = new Set(ids);
  if (present) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

function eventFieldsUnchanged(latest: EventDraft, snapshot: EventDraft) {
  return EVENT_FIELDS.every((field) => latest[field] === snapshot[field]);
}

function fencerName(fencer: FencerDraft) {
  return `${fencer.firstName} ${fencer.lastName}`.trim() || `Member #${fencer.memberNumber}`;
}

// Sends the draft to the API: the tournament, then each event with its fencers.
// Every server id is written back as soon as it arrives, so a retry resumes
// instead of creating the same thing twice.
export function useDraftSaving({
  draft,
  setTournamentId,
  setTournamentSaved,
  updateEventWith,
  removeEvent,
}: DraftSavingOptions) {
  // A ref, not state: two clicks in one render both see the same state, so only
  // a ref can stop the second one from sending a second POST.
  const inFlight = useRef(new Set<string>());
  const [tournamentSaving, setTournamentSaving] = useState(false);
  const [savingEvents, setSavingEvents] = useState<ReadonlySet<string>>(new Set());
  const [removingEvents, setRemovingEvents] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<SaveErrors>({ tournament: null, events: {} });

  function setEventErrors(localId: string, messages: string[]) {
    setErrors((current) => {
      const events = { ...current.events };
      if (messages.length > 0) {
        events[localId] = messages;
      } else {
        delete events[localId];
      }
      return { ...current, events };
    });
  }

  // Creates the tournament the first time and updates it after, so the events
  // below have an id to attach to. Returns that id, or null if it failed.
  async function saveTournament(): Promise<string | null> {
    if (inFlight.current.has(TOURNAMENT_KEY)) {
      return null;
    }
    inFlight.current.add(TOURNAMENT_KEY);
    setTournamentSaving(true);
    setErrors((current) => ({ ...current, tournament: null }));
    try {
      const body = tournamentRequest(draft);
      let id = draft.tournamentId;
      if (id) {
        await updateTournament(id, body);
      } else {
        id = (await createTournament(body)).id;
        // Written before anything else can fail, so a retry updates instead of re-creating.
        setTournamentId(id);
      }
      setTournamentSaved(true);
      return id;
    } catch (error) {
      setErrors((current) => ({ ...current, tournament: errorMessage(error) }));
      return null;
    } finally {
      inFlight.current.delete(TOURNAMENT_KEY);
      setTournamentSaving(false);
    }
  }

  // Deletes the competitors dropped from the card, one request each. Done first
  // so a re-imported fencer doesn't collide with its old copy on member number.
  async function deleteRemovedFencers(localId: string, ids: string[]) {
    const results = await Promise.allSettled(ids.map((id) => deleteCompetitor(id)));
    const failures: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        failures.push(`Couldn't remove a fencer: ${errorMessage(result.reason)}`);
        return;
      }
      updateEventWith(localId, (event) => ({
        ...event,
        removedCompetitorIds: (event.removedCompetitorIds ?? []).filter((id) => id !== ids[index]),
      }));
    });
    return failures;
  }

  // Patches fencers edited since their last save. Dirty is cleared only if the
  // fencer still matches what was sent, so an edit made mid-save is sent next time.
  async function updateEditedFencers(localId: string, fencers: FencerDraft[]) {
    const results = await Promise.allSettled(
      fencers.map((fencer) => updateCompetitor(fencer.competitorId!, competitorRequest(fencer))),
    );
    const failures: string[] = [];
    results.forEach((result, index) => {
      const sent = fencers[index];
      if (result.status === "rejected") {
        failures.push(`${fencerName(sent)}: ${errorMessage(result.reason)}`);
        return;
      }
      updateEventWith(localId, (event) => ({
        ...event,
        fencers: event.fencers.map((fencer) =>
          fencer.id === sent.id && JSON.stringify(competitorRequest(fencer)) === JSON.stringify(competitorRequest(sent))
            ? { ...fencer, dirty: false }
            : fencer,
        ),
      }));
    });
    return failures;
  }

  // Creates fencers that have no server id yet. A fencer removed from the card
  // while its POST was in flight now exists on the server, so its id goes on the
  // removal list for the next save instead of being lost.
  async function createNewFencers(localId: string, eventId: string, fencers: FencerDraft[]) {
    const results = await Promise.allSettled(
      fencers.map((fencer) => createCompetitor({ ...competitorRequest(fencer), eventId })),
    );
    const failures: string[] = [];
    results.forEach((result, index) => {
      const sent = fencers[index];
      if (result.status === "rejected") {
        failures.push(`${fencerName(sent)}: ${errorMessage(result.reason)}`);
        return;
      }
      const competitorId = result.value.id;
      updateEventWith(localId, (event) => {
        const current = event.fencers.find((fencer) => fencer.id === sent.id);
        if (!current) {
          return { ...event, removedCompetitorIds: [...(event.removedCompetitorIds ?? []), competitorId] };
        }
        const unchanged = JSON.stringify(competitorRequest(current)) === JSON.stringify(competitorRequest(sent));
        return {
          ...event,
          fencers: event.fencers.map((fencer) =>
            fencer.id === sent.id ? { ...fencer, competitorId, dirty: !unchanged } : fencer,
          ),
        };
      });
    });
    return failures;
  }

  // Saves one card from its state at click time: the event, then its fencers.
  // Returns true only if everything was sent and the card is now marked saved.
  async function saveEvent(localId: string, tournamentId: string): Promise<boolean> {
    const snapshot = draft.events.find((event) => event.id === localId);
    const key = `event:${localId}`;
    if (!snapshot || inFlight.current.has(key)) {
      return false;
    }
    inFlight.current.add(key);
    setSavingEvents((current) => withId(current, localId, true));
    setEventErrors(localId, []);
    try {
      // The event first, since fencers need its id. The id is written back
      // immediately so a retry after a fencer fails doesn't create a second event.
      const body = eventRequest(snapshot);
      let eventId = snapshot.eventId;
      if (eventId) {
        await updateEvent(eventId, body);
      } else {
        eventId = (await createEvent({ ...body, tournament_id: tournamentId })).id;
        const createdId = eventId;
        updateEventWith(localId, (event) => ({ ...event, eventId: createdId }));
      }

      // Each step is one parallel batch, in this order; a failed batch doesn't
      // stop the next, and the failures are reported together.
      const { toDelete, toUpdate, toCreate } = fencerChanges(snapshot);
      const failures = [
        ...(await deleteRemovedFencers(localId, toDelete)),
        ...(await updateEditedFencers(localId, toUpdate)),
        ...(await createNewFencers(localId, eventId, toCreate)),
      ];
      if (failures.length > 0) {
        setEventErrors(localId, failures);
        return false;
      }

      // Marked saved only if nothing changed while the requests were out, judged
      // against the latest draft; otherwise the card stays open to save again.
      let marked = false;
      updateEventWith(localId, (latest) => {
        const changes = fencerChanges(latest);
        const nothingPending =
          changes.toDelete.length === 0 && changes.toUpdate.length === 0 && changes.toCreate.length === 0;
        marked = nothingPending && eventFieldsUnchanged(latest, snapshot);
        return marked ? { ...latest, saved: true } : latest;
      });
      if (!marked) {
        setEventErrors(localId, ["This event changed while it was saving. Save it again."]);
      }
      return marked;
    } catch (error) {
      setEventErrors(localId, [errorMessage(error)]);
      return false;
    } finally {
      inFlight.current.delete(key);
      setSavingEvents((current) => withId(current, localId, false));
    }
  }

  // Deletes a saved card on the server before dropping it, so a failure leaves
  // the card (with its error) rather than hiding an event that still exists.
  async function removeEventCard(localId: string) {
    const eventId = draft.events.find((event) => event.id === localId)?.eventId;
    if (!eventId) {
      removeEvent(localId);
      return;
    }
    const key = `remove:${localId}`;
    if (inFlight.current.has(key)) {
      return;
    }
    inFlight.current.add(key);
    setRemovingEvents((current) => withId(current, localId, true));
    setEventErrors(localId, []);
    try {
      await deleteEvent(eventId);
      removeEvent(localId);
    } catch (error) {
      setEventErrors(localId, [`Couldn't remove this event: ${errorMessage(error)}`]);
    } finally {
      inFlight.current.delete(key);
      setRemovingEvents((current) => withId(current, localId, false));
    }
  }

  // What Create tournament runs: the tournament if it isn't saved, then every
  // unsaved card in parallel. Returns the tournament id only if all of it saved.
  async function saveUnsaved(): Promise<string | null> {
    const tournamentId = draft.saved && draft.tournamentId ? draft.tournamentId : await saveTournament();
    if (!tournamentId) {
      return null;
    }
    const unsaved = draft.events.filter((event) => !event.saved);
    const results = await Promise.all(unsaved.map((event) => saveEvent(event.id, tournamentId)));
    return results.every(Boolean) ? tournamentId : null;
  }

  return {
    tournamentSaving,
    savingEvents,
    removingEvents,
    errors,
    saveTournament,
    saveEvent,
    removeEventCard,
    saveUnsaved,
  };
}
