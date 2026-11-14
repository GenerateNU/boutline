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

// Compares what would be sent, so a fencer edited and edited back still counts as unchanged.
function fencerUnchanged(latest: FencerDraft, sent: FencerDraft) {
  return JSON.stringify(competitorRequest(latest)) === JSON.stringify(competitorRequest(sent));
}

function fencerName(fencer: FencerDraft) {
  return `${fencer.firstName} ${fencer.lastName}`.trim() || `Member #${fencer.memberNumber}`;
}

interface Batch<T, R> {
  items: T[];
  send: (item: T) => Promise<R>;
  onSent: (item: T, result: R) => void;
  describeFailure: (item: T, error: unknown) => string;
}

// Sends one request per item, all at once. Each success is written back through
// onSent; each failure becomes one line of the card's error.
async function sendBatch<T, R>({ items, send, onSent, describeFailure }: Batch<T, R>) {
  const results = await Promise.allSettled(items.map((item) => send(item)));
  const failures: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      onSent(items[index], result.value);
    } else {
      failures.push(describeFailure(items[index], result.reason));
    }
  });
  return failures;
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

  function updateFencerWith(localId: string, fencerId: string, update: (fencer: FencerDraft) => FencerDraft) {
    updateEventWith(localId, (event) => ({
      ...event,
      fencers: event.fencers.map((fencer) => (fencer.id === fencerId ? update(fencer) : fencer)),
    }));
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
      if (draft.tournamentId) {
        await updateTournament(draft.tournamentId, body);
        setTournamentSaved(true);
        return draft.tournamentId;
      }
      const { id } = await createTournament(body);
      // Written before anything else can fail, so a retry updates instead of re-creating.
      setTournamentId(id);
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

  // Creates the event the first time and updates it after. Returns its server
  // id, which the fencers need.
  async function sendEvent(localId: string, snapshot: EventDraft, tournamentId: string) {
    const body = eventRequest(snapshot);
    if (snapshot.eventId) {
      await updateEvent(snapshot.eventId, body);
      return snapshot.eventId;
    }
    const { id } = await createEvent({ ...body, tournament_id: tournamentId });
    // Written right away, so a retry after a fencer fails doesn't create a second event.
    updateEventWith(localId, (event) => ({ ...event, eventId: id }));
    return id;
  }

  // Deletes the competitors dropped from the card. Done before the creates so a
  // re-imported fencer doesn't collide with its old copy on member number.
  function deleteRemovedFencers(localId: string, ids: string[]) {
    return sendBatch({
      items: ids,
      send: deleteCompetitor,
      onSent: (deletedId) =>
        updateEventWith(localId, (event) => ({
          ...event,
          removedCompetitorIds: (event.removedCompetitorIds ?? []).filter((id) => id !== deletedId),
        })),
      describeFailure: (_, error) => `Couldn't remove a fencer: ${errorMessage(error)}`,
    });
  }

  function updateEditedFencers(localId: string, fencers: FencerDraft[]) {
    return sendBatch({
      items: fencers,
      send: (fencer) => updateCompetitor(fencer.competitorId!, competitorRequest(fencer)),
      // Only clears dirty if the fencer still matches what was sent; an edit made
      // while the request was out stays dirty and goes out on the next save.
      onSent: (sent) =>
        updateFencerWith(localId, sent.id, (latest) =>
          fencerUnchanged(latest, sent) ? { ...latest, dirty: false } : latest,
        ),
      describeFailure: (fencer, error) => `${fencerName(fencer)}: ${errorMessage(error)}`,
    });
  }

  function createNewFencers(localId: string, eventId: string, fencers: FencerDraft[]) {
    return sendBatch({
      items: fencers,
      send: (fencer) => createCompetitor({ ...competitorRequest(fencer), eventId }),
      onSent: (sent, { id: competitorId }) =>
        updateEventWith(localId, (event) => {
          const latest = event.fencers.find((fencer) => fencer.id === sent.id);
          // Removed from the card while its POST was out, so it now exists on the
          // server with nothing pointing at it. Queue it for deletion on the next save.
          if (!latest) {
            return { ...event, removedCompetitorIds: [...(event.removedCompetitorIds ?? []), competitorId] };
          }
          // Keep the id either way, so the next save patches instead of creating a
          // duplicate. Edited while the POST was out means that patch is still owed.
          const edited = !fencerUnchanged(latest, sent);
          return {
            ...event,
            fencers: event.fencers.map((fencer) =>
              fencer.id === sent.id ? { ...fencer, competitorId, dirty: edited } : fencer,
            ),
          };
        }),
      describeFailure: (fencer, error) => `${fencerName(fencer)}: ${errorMessage(error)}`,
    });
  }

  // Marks the card saved only if nothing changed while its requests were out,
  // judged against the latest draft. The session-storage setter runs the updater
  // before returning, so the result is known by the next line.
  function markSavedIfUnchanged(localId: string, snapshot: EventDraft) {
    let marked = false;
    updateEventWith(localId, (latest) => {
      const { toDelete, toUpdate, toCreate } = fencerChanges(latest);
      const fencersSettled = toDelete.length === 0 && toUpdate.length === 0 && toCreate.length === 0;
      marked = fencersSettled && eventFieldsUnchanged(latest, snapshot);
      return marked ? { ...latest, saved: true } : latest;
    });
    return marked;
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
      const eventId = await sendEvent(localId, snapshot, tournamentId);

      // One batch per kind of change, in this order. A failed batch doesn't stop
      // the next, and all the failures are reported together.
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

      if (!markSavedIfUnchanged(localId, snapshot)) {
        setEventErrors(localId, ["This event changed while it was saving. Save it again."]);
        return false;
      }
      return true;
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
    const tournamentSaved = draft.saved && draft.tournamentId;
    const tournamentId = tournamentSaved ? draft.tournamentId! : await saveTournament();
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
