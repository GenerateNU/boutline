import { Pagination } from "@/components/primitives/pagination";
import { Section } from "@/components/primitives/section";
import { TournamentList } from "@/components/tournament-list";
import { listTournaments } from "@/lib/tournaments";

export default async function TournamentsPage({
  searchParams,
}: PageProps<"/tournaments">) {
  const query = await searchParams;
  const offset = Math.max(0, Number(query.offset) || 0);

  const { data, total, limit } = await listTournaments({ offset });

  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Tournament Page" className="flex flex-col gap-4">
        <p>This is the tournament page.</p>
        <p>also have a space to enter in a &apos;private code&apos;</p>
        <p>also they should be able to login/register here via navbar</p>
        <p>
          they should also be able to search / filter for tournaments here.
          There will be a calendar / weekly view that displays past, present,
          and future tournaments
        </p>
      </Section>

      <Section title="Tournaments" className="flex flex-col gap-4">
        <TournamentList tournaments={data} />
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          basePath="/tournaments"
        />
      </Section>
    </div>
  );
}
