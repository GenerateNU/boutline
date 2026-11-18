"use client";

import { useParams } from "next/navigation";

import { BackButton } from "@/components/primitives/back-button";

import { ScoreboardSkeleton } from "./_components/scoreboard-skeleton";

// A loading screen receives no params, so the back link reads them from the URL.
export default function RefereeViewPageLoading() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();

  return (
    <>
      <BackButton href={`/tournaments/${tournamentId}/events/${eventId}/pooling`} className="self-start">
        Pools
      </BackButton>
      <ScoreboardSkeleton />
    </>
  );
}
