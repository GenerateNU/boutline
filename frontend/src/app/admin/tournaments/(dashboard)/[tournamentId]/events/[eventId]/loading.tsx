"use client";

import { useParams } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { Section } from "@/components/primitives/section";
import { Skeleton } from "@/components/primitives/skeleton";

// A client component so it can read the ids from the URL; loading screens get no route params.
export default function AdminEventLoading() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();

  return (
    <div className="flex flex-col gap-10">
      <span role="status" className="sr-only">
        Loading event
      </span>
      <BackButton href={`/tournaments/${tournamentId}/events/${eventId}`} />
      <Section title="Pool stage">
        <Skeleton className="h-6 w-24 self-start rounded-full" />
      </Section>
    </div>
  );
}
