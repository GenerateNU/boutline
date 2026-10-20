import { Scoreboard } from "./_components/scoreboard";

interface RefereeViewPageProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/bout/[boutId]/referee"> {}

export default async function RefereeViewPage({ params }: RefereeViewPageProps) {
  const { boutId } = await params;

  return <Scoreboard boutId={boutId} />;
}
