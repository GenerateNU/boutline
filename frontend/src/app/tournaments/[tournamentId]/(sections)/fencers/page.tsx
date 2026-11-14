import { FencerList } from "@/features/competitor/components/fencer-list";

export default async function FencersTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/fencers">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  return (
    <FencerList
      tournamentId={tournamentId}
      basePath={`/tournaments/${tournamentId}/fencers`}
      query={query}
    />
  );
}
