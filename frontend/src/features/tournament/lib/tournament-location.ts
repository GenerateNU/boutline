import type { Tournament } from "@/features/tournament/types/tournament";

export function tournamentLocation({ city, country }: Pick<Tournament, "city" | "country">) {
  return [city, country].filter(Boolean).join(", ");
}
