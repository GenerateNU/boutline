import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { Section } from "@/components/primitives/section";
import { SearchForm } from "@/features/tournament/components/search-form";
import { TournamentStatusBadge } from "@/features/tournament/components/tournament-status-badge";
import { getTournaments } from "@/features/tournament/services/getTournaments";

const PAGE_SIZE = 20;

export default async function TournamentsPage({
  searchParams,
}: PageProps<"/tournaments">) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim() : "";
  const offset = Math.max(0, Number(query.offset) || 0);

  const { data, total } = await getTournaments(PAGE_SIZE, offset, search);

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;
  const pageQuery = search ? `&q=${encodeURIComponent(search)}` : "";

  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Tournaments" className="flex flex-col gap-4">
        <SearchForm
          action="/tournaments"
          placeholder="Search tournaments"
          defaultValue={search}
        />

        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {search
              ? `No tournaments match "${search}".`
              : "No tournaments yet."}
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {data.map((tournament) => (
            <li key={tournament.id}>
              <Link href={`/tournaments/${tournament.id}`}>
                <Card className="rounded-md p-4 transition-colors hover:bg-muted">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {tournament.name}
                    </CardTitle>
                  </CardHeader>
                  <div className="flex items-end justify-between">
                    <CardDescription className="text-xs text-muted-foreground">
                      City, Country
                    </CardDescription>
                    <TournamentStatusBadge status={tournament.status} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex justify-between">
          {hasPrev ? (
            <Link
              href={`/tournaments?offset=${Math.max(offset - PAGE_SIZE, 0)}${pageQuery}`}
              className="underline"
            >
              Previous
            </Link>
          ) : (
            <span className="opacity-40">Previous</span>
          )}
          {hasNext ? (
            <Link
              href={`/tournaments?offset=${offset + PAGE_SIZE}${pageQuery}`}
              className="underline"
            >
              Next
            </Link>
          ) : (
            <span className="opacity-40">Next</span>
          )}
        </div>
      </Section>
    </div>
  );
}
