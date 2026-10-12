import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Section } from "@/components/primitives/section";

const tournaments = [
  { id: "1", name: "Boston Fall Open", date: "2026-10-24", location: "Boston, MA" },
  { id: "2", name: "New England Cadet Circuit", date: "2026-11-14", location: "Providence, RI" },
  { id: "3", name: "Winter Y14 Challenge", date: "2026-12-05", location: "Hartford, CT" },
];

export default function AdminTournamentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Tournaments">
        <ul className="flex flex-col gap-3">
          {tournaments.map(({ id, name, date, location }) => (
            <li key={id}>
              <Link
                href={`/tournaments/${id}`}
                className="flex flex-col gap-1 rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
              >
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {date} · {location}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Button asChild className="rounded-full">
          <Link href="/admin/tournament/new">New tournament</Link>
        </Button>
      </Section>
    </main>
  );
}
