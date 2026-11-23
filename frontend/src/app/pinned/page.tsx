import { BackButton } from "@/components/primitives/back-button";
import { getEvents } from "@/features/event/services/getEvents";
import { PinnedItemsView } from "@/features/pinning/components/pinned-items-view";
import { readStringParam } from "@/lib/search-params";

export default async function PinnedPage({ searchParams }: PageProps<"/pinned">) {
  const tournamentId = readStringParam(await searchParams, "tournamentId");
  // Pins save only ids, so the event names their rows show are looked up here, once.
  const events = tournamentId ? await getEvents(tournamentId) : [];
  const eventNames = Object.fromEntries(events.map(({ id, name }) => [id, name]));
  const backHref = tournamentId ? `/tournaments/${encodeURIComponent(tournamentId)}` : "/tournaments";

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-6 px-4 py-10">
      <BackButton href={backHref} className="self-start" />
      <h1 className="text-xl font-medium text-obsidian">View Pins</h1>
      <PinnedItemsView tournamentId={tournamentId || undefined} eventNames={eventNames} />
    </main>
  );
}
