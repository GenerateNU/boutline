import { Text } from "@/components/primitives/text";

import { RankingList } from "./_components/ranking-list";
import { getEventResults } from "./_services/get-event-results";

export default async function ResultsTab({
  params,
}: PageProps<"/admin/tournaments/[tournamentId]/events/[eventId]/results">) {
  const { tournamentId, eventId } = await params;
  const results = await getEventResults(eventId);

  if (results.length === 0) {
    return <Text variant="muted">Results appear once a stage ends.</Text>;
  }

  return (
    <RankingList
      results={results}
      tournamentId={tournamentId}
      eventId={eventId}
    />
  );
}
