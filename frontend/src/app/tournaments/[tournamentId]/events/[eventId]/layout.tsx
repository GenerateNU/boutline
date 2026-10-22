import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TabNav } from "@/components/primitives/tab-nav";
import { getEvent } from "@/features/event/services/getEvent";

const tabs = [
  { label: "Pooling", segment: "pooling" },
  { label: "Fencers", segment: "fencers" },
  { label: "Tableau", segment: "tableau" },
  { label: "Results", segment: "results" },
];

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/tournaments/${tournamentId}`}
        className="flex w-fit items-center gap-1 rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft aria-hidden className="size-5" />
        Tournament
      </Link>
      <div className="flex flex-col gap-3.5">
        <h1 className="text-xl font-medium">{event.name}</h1>
        <TabNav
          label="Event sections"
          basePath={`/tournaments/${tournamentId}/events/${eventId}`}
          tabs={tabs}
        />
      </div>
      {children}
    </div>
  );
}
