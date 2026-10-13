import Link from "next/link";

import { Section } from "@/components/primitives/section";
import { getTournaments } from "@/features/tournament/services/getTournaments";

const PAGE_SIZE = 20;

type TournamentsPageProps = {
  searchParams: Promise<{ offset?: string }>;
};

export default async function TournamentsPage({
  searchParams,
}: TournamentsPageProps) {
  const offset = Number((await searchParams).offset) || 0;
  const { data, total } = await getTournaments(PAGE_SIZE, offset);

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Tournaments" className="flex flex-col gap-4">
        <ul className="flex flex-col gap-3">
          {data.map((tournament) => (
            <li key={tournament.id}>
              <Link
                href={`/tournaments/${tournament.id}`}
                className="flex flex-col gap-1 rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
              >
                <span className="text-sm font-medium">{tournament.name}</span>
                <span className="text-xs text-muted-foreground">
                  {tournament.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex justify-between">
          <Link
            href={`/tournaments?offset=${Math.max(offset - PAGE_SIZE, 0)}`}
            aria-disabled={!hasPrev}
            className={hasPrev ? "underline" : "pointer-events-none opacity-40"}
          >
            Previous
          </Link>
          <Link
            href={`/tournaments?offset=${offset + PAGE_SIZE}`}
            aria-disabled={!hasNext}
            className={hasNext ? "underline" : "pointer-events-none opacity-40"}
          >
            Next
          </Link>
        </div>
      </Section>
    </div>
  );
}
