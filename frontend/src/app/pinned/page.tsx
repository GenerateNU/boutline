import { BackButton } from "@/components/primitives/back-button";
import { PinnedItemsView } from "@/features/pinning/components/pinned-items-view";
import { readStringParam } from "@/lib/search-params";

export default async function PinnedPage({ searchParams }: PageProps<"/pinned">) {
  const tournamentId = readStringParam(await searchParams, "tournamentId");
  const backHref = tournamentId ? `/tournaments/${encodeURIComponent(tournamentId)}` : "/tournaments";

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-6 px-4 py-10">
      <BackButton href={backHref} className="self-start" />
      <h1 className="text-xl font-medium text-obsidian">View Pins</h1>
      <PinnedItemsView tournamentId={tournamentId || undefined} />
    </main>
  );
}
