import { redirect } from "next/navigation";

interface EventPageProps extends PageProps<"/tournaments/[tournamentId]/events/[eventId]"> {}

// Events have no overview tab, so the bare event URL lands on the first tab.
export default async function EventPage({ params }: EventPageProps) {
  const { tournamentId, eventId } = await params;
  redirect(`/tournaments/${tournamentId}/events/${eventId}/fencers`);
}
