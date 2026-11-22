// In memory only: sessionStorage would make the server and client render different
// skeletons on a fresh load, and a hard refresh should shimmer anyway.
const EVENT_NAMES = new Map<string, string>();
const TOURNAMENT_NAMES = new Map<string, string>();

export function rememberEventName(eventId: string, name: string) {
  EVENT_NAMES.set(eventId, name);
}

export function rememberedEventName(eventId: string) {
  return EVENT_NAMES.get(eventId);
}

export function rememberTournamentName(tournamentId: string, name: string) {
  TOURNAMENT_NAMES.set(tournamentId, name);
}

export function rememberedTournamentName(tournamentId: string) {
  return TOURNAMENT_NAMES.get(tournamentId);
}
