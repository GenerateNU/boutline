import { SessionWatcher } from "@/features/auth/components/session-watcher";

import { Scoreboard } from "./_components/scoreboard";

interface RefereeViewPageProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/bout/[boutId]/referee"> {}

export default async function RefereeViewPage({ params }: RefereeViewPageProps) {
  const { boutId } = await params;

  return (
    <>
      <SessionWatcher />
      <Scoreboard boutId={boutId} />
    </>
  );
}
