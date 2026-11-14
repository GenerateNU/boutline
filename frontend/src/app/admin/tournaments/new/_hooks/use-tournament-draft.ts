import { useSessionStorage } from "@/lib/hooks/use-session-storage";
import { CompetitorImportRow } from "@/types/competitor-import";

import { EventDraft, TournamentDraft } from "../_types/tournament-draft";
import { EMPTY_TOURNAMENT_DRAFT, importFencers, newEventDraft } from "../tournament-draft-helpers";

const DRAFT_KEY = "tournament-draft";

type TournamentField = Exclude<keyof TournamentDraft, "events">;

// The whole creation form, events and imported fencers included, kept in
// sessionStorage so a reload doesn't lose it. Every change goes through an
// updater so it applies to the latest draft, even after an awaited CSV parse.
export function useTournamentDraft() {
  const [draft, setDraft] = useSessionStorage(DRAFT_KEY, EMPTY_TOURNAMENT_DRAFT);

  function updateEvents(update: (events: EventDraft[]) => EventDraft[]) {
    setDraft((current) => ({ ...current, events: update(current.events) }));
  }

  return {
    draft,
    setField: (field: TournamentField, value: string) =>
      setDraft((current) => ({ ...current, [field]: value })),
    addEvent: () => updateEvents((events) => [...events, newEventDraft()]),
    updateEvent: (id: string, patch: Partial<EventDraft>) =>
      updateEvents((events) => events.map((event) => (event.id === id ? { ...event, ...patch } : event))),
    removeEvent: (id: string) => updateEvents((events) => events.filter((event) => event.id !== id)),
    importRows: (rows: CompetitorImportRow[]) => updateEvents((events) => importFencers(events, rows)),
    clear: () => setDraft(EMPTY_TOURNAMENT_DRAFT),
  };
}
