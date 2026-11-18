import { Text } from "@/components/primitives/text";
import { FencerBrowser } from "@/features/competitor/components/fencer-browser";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";

export default async function EventFencersTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/events/[eventId]/fencers">) {
  const [{ tournamentId, eventId }, query] = await Promise.all([params, searchParams]);
  const role = await getTournamentRole(tournamentId);

  return (
    <>
      <Text as="h1" variant="title">
        Fencers
      </Text>
      <FencerBrowser
        tournamentId={tournamentId}
        basePath={`/tournaments/${tournamentId}/events/${eventId}/fencers`}
        query={query}
        eventId={eventId}
        canEdit={role === "admin"}
      />
    </>
  );
}
