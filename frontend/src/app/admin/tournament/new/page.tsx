import { Section } from "@/components/primitives/section";

import { NewTournamentForm } from "./_components/new-tournament-form";

export default function NewTournamentPage() {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="New tournament">
        <NewTournamentForm />
      </Section>
    </main>
  );
}
