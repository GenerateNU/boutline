import { FencerList } from "@/features/competitor/components/fencer-list";

export default async function FencersTab({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  return (
    <FencerList
      tournamentId={tournamentId}
      basePath={`/admin/tournaments/${tournamentId}`}
      query={query}
    />
  );
}
