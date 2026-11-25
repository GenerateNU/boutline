import { EventTabNav } from "../_components/event-tab-nav";

export default function EventDashboardLayout({
  children,
}: LayoutProps<"/admin/tournaments/[tournamentId]/events/[eventId]">) {
  return (
    <>
      <EventTabNav />
      {children}
    </>
  );
}
