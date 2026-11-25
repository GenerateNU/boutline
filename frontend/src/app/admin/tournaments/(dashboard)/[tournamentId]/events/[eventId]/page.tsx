import { redirect } from "next/navigation";

// The event dashboard has no overview tab, so the bare event URL lands on the first tab.
export default async function EventDashboardPage({
  params,
}: PageProps<"/admin/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;
  redirect(`/admin/tournaments/${tournamentId}/events/${eventId}/pools`);
}
