"use client";

import { useParams } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { Section } from "@/components/primitives/section";
import { Skeleton } from "@/components/primitives/skeleton";

// A client component so the back link can read the ids from the URL; loading screens get
// no route params. Only the event's name shimmers, so the link works before it arrives.
export default function PoolsTabLoading() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();

  return (
    <div className="flex flex-col gap-10">
      <span role="status" className="sr-only">
        Loading event
      </span>
      <BackButton href={`/tournaments/${tournamentId}/events/${eventId}`} className="self-start">
        <span className="sr-only">Event</span>
        <Skeleton className="h-4 w-32" />
      </BackButton>
      <Section title="Pool stage">
        <Skeleton className="h-6 w-24 self-start rounded-full" />
      </Section>
    </div>
  );
}
