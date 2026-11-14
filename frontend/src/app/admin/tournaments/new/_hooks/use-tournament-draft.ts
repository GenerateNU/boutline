import { useSessionStorage } from "@/lib/hooks/use-session-storage";
import { CompetitorImportRow } from "@/types/competitor-import";

import { EventDraft, FencerDraft, TournamentDraft } from "../_types/tournament-draft";
import { EMPTY_TOURNAMENT_DRAFT, importFencers, newEventDraft, newFencerDraft } from "../tournament-draft-helpers";

// Bump the version whenever TournamentDraft's shape changes, so a draft stored
// in the old shape is ignored instead of crashing the form.
const DRAFT_KEY = "tournament-creation-draft:2";

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

  return {
    draft,
    setField: (field: TournamentField, value: string) =>
      setDraft((current) => ({ ...current, [field]: value })),
    setTournamentSaved: (saved: boolean) => setDraft((current) => ({ ...current, saved })),
    addEvent: () => updateEvents((events) => [...events, newEventDraft()]),
    updateEvent,
    removeEvent: (id: string) => updateEvents((events) => events.filter((event) => event.id !== id)),
    addFencer: (eventId: string) => updateFencers(eventId, (fencers) => [...fencers, newFencerDraft()]),
    updateFencer: (eventId: string, fencerId: string, patch: Partial<FencerDraft>) =>
      updateFencers(eventId, (fencers) =>
        fencers.map((fencer) => (fencer.id === fencerId ? { ...fencer, ...patch } : fencer)),
      ),
    removeFencer: (eventId: string, fencerId: string) =>
      updateFencers(eventId, (fencers) => fencers.filter((fencer) => fencer.id !== fencerId)),
    importRows: (rows: CompetitorImportRow[]) => updateEvents((events) => importFencers(events, rows)),
    clear: () => setDraft(EMPTY_TOURNAMENT_DRAFT),
  };
}
