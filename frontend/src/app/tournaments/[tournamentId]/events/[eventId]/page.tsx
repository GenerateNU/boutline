import { redirect } from "next/navigation";

// Events have no overview tab, so the bare event URL lands on the first tab.
export default async function EventPage({
  params,
}: PageProps<"/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;
  redirect(`/tournaments/${tournamentId}/events/${eventId}/fencers`);
}
