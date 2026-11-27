import { BackButton } from "@/components/primitives/back-button";
import { Background } from "@/components/primitives/background";
import { readStringParam } from "@/lib/search-params";

import { EventForm } from "../_components/event-form";

export default async function NewTournamentEventPage({ searchParams }: PageProps<"/admin/tournaments/new/event">) {
  const eventId = readStringParam(await searchParams, "id");

  return (
    <main className="relative isolate mx-auto flex w-full max-w-mobile flex-col gap-6 overflow-hidden px-7 py-5">
      <Background version={4} className="opacity-50" />
      <BackButton href="/admin/tournaments/new" className="self-start" />
      <h1 className="text-xl font-medium text-brand">Create Event</h1>
      <EventForm eventId={eventId} />
    </main>
  );
}
