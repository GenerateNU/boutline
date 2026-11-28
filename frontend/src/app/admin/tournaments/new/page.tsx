import { BackButton } from "@/components/primitives/back-button";
import { Background } from "@/components/primitives/background";

import { NewTournamentForm } from "./_components/new-tournament-form";

export default function NewTournamentPage() {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-mobile flex-col gap-6 overflow-hidden px-7 py-5">
      <Background version={4} className="opacity-50" />
      <BackButton href="/admin/tournaments" className="self-start" />
      <h1 className="text-xl font-medium text-brand">Create Tournament</h1>
      <NewTournamentForm />
    </main>
  );
}
