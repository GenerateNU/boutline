"use client";

import { useParams } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";
import { Card } from "@/components/primitives/card";
import { SearchBar } from "@/components/primitives/search-bar";
import { Skeleton } from "@/components/primitives/skeleton";

const BOUT_CARD_COUNT = 3;

// A loading screen receives no params, so the back link reads them from the URL.
export default function AdminPoolLoading() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <p role="status" className="sr-only">
        Loading pool
      </p>
      <div className="flex flex-col gap-3">
        <BackButton href={`/admin/tournaments/${tournamentId}/events/${eventId}`} aria-label="Back to Pools">
          Pools
        </BackButton>
        <Skeleton className="h-8 w-48" />
      </div>
      <SearchBar placeholder="Search fencers" aria-label="Search fencers" disabled />
      <div aria-hidden className="flex flex-col gap-4">
        {Array.from({ length: BOUT_CARD_COUNT }, (_, index) => (
          <Card key={index} className="gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
