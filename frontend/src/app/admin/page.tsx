import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Section } from "@/components/primitives/section";

const menu = ["tools", "reports", "view", "file (save)"];

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
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/admin/tournaments">View tournaments</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/admin/tournament/new">New tournament</Link>
          </Button>
        </div>
      </Section>
    </main>
  );
}
