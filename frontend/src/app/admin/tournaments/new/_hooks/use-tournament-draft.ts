import { ACCOUNT_STORAGE_PREFIX } from "@/features/auth/services/account-storage";
import { useSessionStorage } from "@/lib/hooks/use-session-storage";
import { CompetitorImportRow } from "@/types/competitor-import";

import { EventDraft, FencerDraft, TournamentDraft } from "../_types/tournament-draft";
import { EMPTY_TOURNAMENT_DRAFT, importFencers, newEventDraft, newFencerDraft } from "../tournament-draft-helpers";

// Account-scoped, so logging out clears it. Not "tournament-draft": the old
// two-step form stored a different shape there, and reading it would crash this form.
const DRAFT_KEY = `${ACCOUNT_STORAGE_PREFIX}tournament-creation-draft`;

type TournamentField = Exclude<keyof TournamentDraft, "events" | "saved">;

// The whole creation form, events and fencers included, kept in sessionStorage
// so a reload doesn't lose it. Every change goes through an updater so it
// applies to the latest draft, even after an awaited CSV parse.
export function useTournamentDraft() {
  const [draft, setDraft] = useSessionStorage(DRAFT_KEY, EMPTY_TOURNAMENT_DRAFT);

  function updateEvents(update: (events: EventDraft[]) => EventDraft[]) {
    setDraft((current) => ({ ...current, events: update(current.events) }));
  }

  function updateEvent(id: string, patch: Partial<EventDraft>) {
    updateEvents((events) => events.map((event) => (event.id === id ? { ...event, ...patch } : event)));
  }

  function updateFencers(eventId: string, update: (fencers: FencerDraft[]) => FencerDraft[]) {
    updateEvents((events) =>
      events.map((event) => (event.id === eventId ? { ...event, fencers: update(event.fencers) } : event)),
    );
  }

  function setField(field: TournamentField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function setTournamentSaved(saved: boolean) {
    setDraft((current) => ({ ...current, saved }));
  }

  function addEvent() {
    updateEvents((events) => [...events, newEventDraft()]);
  }

  function removeEvent(id: string) {
    updateEvents((events) => events.filter((event) => event.id !== id));
  }

  function addFencer(eventId: string) {
    updateFencers(eventId, (fencers) => [...fencers, newFencerDraft()]);
  }

  function updateFencer(eventId: string, fencerId: string, patch: Partial<FencerDraft>) {
    updateFencers(eventId, (fencers) =>
      fencers.map((fencer) => (fencer.id === fencerId ? { ...fencer, ...patch } : fencer)),
    );
  }

  function removeFencer(eventId: string, fencerId: string) {
    updateFencers(eventId, (fencers) => fencers.filter((fencer) => fencer.id !== fencerId));
  }

  function importRows(rows: CompetitorImportRow[]) {
    updateEvents((events) => importFencers(events, rows));
  }

  function clear() {
    setDraft(EMPTY_TOURNAMENT_DRAFT);
  }

  return {
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
  };
}
