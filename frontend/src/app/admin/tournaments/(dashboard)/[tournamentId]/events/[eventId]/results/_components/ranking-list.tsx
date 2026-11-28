import type { EventResult } from "../_types/event-result";
import { RankingRow } from "./ranking-row";

interface RankingListProps {
  results: EventResult[];
  tournamentId: string;
  eventId: string;
}

function RankingList({ results, tournamentId, eventId }: RankingListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {results.map((result) => (
        <li key={result.competitor_id}>
          <RankingRow
            result={result}
            fencerHref={`/tournaments/${encodeURIComponent(tournamentId)}/events/${encodeURIComponent(eventId)}/fencers/${encodeURIComponent(result.competitor_id)}`}
          />
        </li>
      ))}
    </ul>
  );
}

export { RankingList };
