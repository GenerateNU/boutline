import { notFound } from "next/navigation";

import { getEvent } from "@/features/event/services/getEvent";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";

import { EventSettingsForm } from "./_components/event-settings-form";

export default async function SettingsTab({
  params,
}: PageProps<"/admin/tournaments/[tournamentId]/events/[eventId]/settings">) {
  const { tournamentId, eventId } = await params;
  const [event, role] = await Promise.all([getEvent(eventId), getTournamentRole(tournamentId)]);
  if (!event) {
    notFound();
  }

  // Referees can look; only admins get the Edit button, and the backend guards the write anyway.
  return <EventSettingsForm event={event} canManage={role === "admin"} />;
}
