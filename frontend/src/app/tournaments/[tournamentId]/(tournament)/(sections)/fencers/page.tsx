import { FencerBrowser } from "@/features/competitor/components/fencer-browser";

export default async function FencersTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/fencers">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  return (
    <div className="flex flex-col gap-4">
      <FencerBrowser
        tournamentId={tournamentId}
        basePath={`/tournaments/${tournamentId}/fencers`}
        query={query}
      />
    </div>
  );
}
