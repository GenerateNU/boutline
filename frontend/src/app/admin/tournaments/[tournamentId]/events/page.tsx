import { EventSchedule } from "@/features/event/components/event-schedule";

export default async function EventsTab({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]/events">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  return (
    <EventSchedule
      tournamentId={tournamentId}
      basePath={`/admin/tournaments/${tournamentId}/events`}
      query={query}
    />
  );
}
