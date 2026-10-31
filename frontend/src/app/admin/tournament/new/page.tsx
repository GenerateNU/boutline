import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { NewTournamentForm } from "./_components/new-tournament-form";

export default function NewTournamentPage() {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-6 px-7 py-5">
      <Link href="/admin/tournaments" className="flex items-center gap-1 self-start">
        <ChevronLeft aria-hidden className="size-6" />
        Back
      </Link>
      <h1 className="text-xl font-medium text-brand">Create Tournament</h1>
      <NewTournamentForm />
    </main>
  );
}
