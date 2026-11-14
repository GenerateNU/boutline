import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import Link from "next/link";

import { NewEventForm } from "./_components/new-event-form";

export default async function NewEventPage({
  searchParams,
}: PageProps<"/admin/tournaments/new/event">) {
  const { tournamentId } = await searchParams;
  const eventsHref =
    typeof tournamentId === "string"
      ? `/tournaments/${encodeURIComponent(tournamentId)}/events`
      : undefined;
  const back = eventsHref
    ? { href: eventsHref, label: "Events" }
    : { href: "/admin/tournaments/new", label: "Tournament" };

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-6 px-7 py-5">
      <Link href={back.href} className="flex items-center gap-1 self-start">
        <ChevronLeftOutlined aria-hidden className="size-6" />
        {back.label}
      </Link>
      <h1 className="text-xl font-medium text-brand">Create Event</h1>
      <NewEventForm
        doneHref={eventsHref ?? "/admin/tournaments"}
        completesTournamentDraft={eventsHref === undefined}
      />
    </main>
  );
}
