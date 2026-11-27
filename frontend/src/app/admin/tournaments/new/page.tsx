import { BackButton } from "@/components/primitives/back-button";

import { NewTournamentForm } from "./_components/new-tournament-form";

export default function NewTournamentPage() {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-6 px-7 py-5">
      <BackButton href="/admin/tournaments" className="self-start" />
      <h1 className="text-xl font-medium text-brand">Create Tournament</h1>
      <NewTournamentForm />
    </main>
  );
}
