import { EventSchedule } from "@/features/event/components/event-schedule";

export default async function EventsTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/events">) {
  // params and searchParams are both Promises in Next 15+. Promise.all awaits
  // them in parallel, and the array destructuring unpacks the two results.
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  return (
    <EventSchedule
      tournamentId={tournamentId}
      basePath={`/tournaments/${tournamentId}/events`}
      query={query}
    />
  );
}
