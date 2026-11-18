import { BackButton } from "@/components/primitives/back-button";
import { SessionWatcher } from "@/features/auth/components/session-watcher";

import { Scoreboard } from "./_components/scoreboard";

interface RefereeViewPageProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/bout/[boutId]/referee"> {}

// Back goes to Pools rather than the bout page, which only knows the seeded bouts.
export default async function RefereeViewPage({ params }: RefereeViewPageProps) {
  const { tournamentId, eventId, boutId } = await params;

  return (
    <>
      <SessionWatcher />
      <BackButton href={`/tournaments/${tournamentId}/events/${eventId}/pooling`} className="self-start">
        Pools
      </BackButton>
      <Scoreboard boutId={boutId} />
    </>
  );
}
