import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { NewEventForm } from "./_components/new-event-form";

export default async function NewEventPage({
  searchParams,
}: PageProps<"/admin/tournament/new/event">) {
  const { tournamentId } = await searchParams;
  const back =
    typeof tournamentId === "string"
      ? { href: `/tournaments/${encodeURIComponent(tournamentId)}/events`, label: "Events" }
      : { href: "/admin/tournament/new", label: "Tournament" };

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-6 px-7 py-5">
      <Link href={back.href} className="flex items-center gap-1 self-start">
        <ChevronLeft aria-hidden className="size-6" />
        {back.label}
      </Link>
      <h1 className="text-xl font-medium text-brand">Create Event</h1>
      <NewEventForm />
    </main>
  );
}
