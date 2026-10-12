import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Section } from "@/components/primitives/section";

const menu = ["tools", "reports", "view", "file (save)"];

const tournaments = [
  { id: "1", name: "Boston Fall Open", date: "2026-10-24", location: "Boston, MA" },
  { id: "2", name: "New England Cadet Circuit", date: "2026-11-14", location: "Providence, RI" },
  { id: "3", name: "Winter Y14 Challenge", date: "2026-12-05", location: "Hartford, CT" },
];

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Admin">
        <ul className="flex flex-wrap gap-2">
          {menu.map((item) => (
            <li key={item}>
              <Button variant="outline" className="rounded-full">
                {item}
              </Button>
            </li>
          ))}
        </ul>
      </Section>

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
          <Link href="/admin/new">New tournament</Link>
        </Button>
      </Section>
    </main>
  );
}
