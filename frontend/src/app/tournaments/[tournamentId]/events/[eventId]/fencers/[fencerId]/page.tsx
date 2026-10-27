import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Chip } from "@/components/primitives/chip";
import { getCompetitor } from "@/features/competitor/services/getCompetitor";
import { PoolStatCard } from "@/features/pool/components/pool-stat-card";
import { poolStatusLabel } from "@/features/pool/lib/find-fencer-pool";
import { getFencerPool } from "@/features/pool/services/getFencerPool";

export default async function EventFencerPage({
  params,
}: PageProps<"/tournaments/[tournamentId]/events/[eventId]/fencers/[fencerId]">) {
  const { tournamentId, eventId, fencerId } = await params;
  const [competitor, pool] = await Promise.all([
    getCompetitor(fencerId),
    getFencerPool(eventId, fencerId),
  ]);

  if (!competitor) {
    notFound();
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/tournaments/${tournamentId}/events/${eventId}/fencers`}
          className="flex items-center gap-1 text-sm"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Fencers
        </Link>
        <h1 className="text-xl font-semibold">
          {competitor.firstName} {competitor.lastName}
        </h1>
        <p className="text-sm">{competitor.team || "No club"}</p>
      </div>

      {pool ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Chip className="rounded-sm border-foreground bg-foreground px-1.5 py-0.5 text-xs text-background">
              {poolStatusLabel[pool.status]}
            </Chip>
            <p aria-hidden className="text-muted-foreground">
              •
            </p>
            <p>{pool.fencerCount} Fencers</p>
          </div>
          <div className="flex gap-3">
            <PoolStatCard label="Pool" value={String(pool.poolNumber)} />
            <PoolStatCard label="Strip" value={pool.strip ?? "TBC"} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not assigned to a pool in this event yet.
        </p>
      )}
    </section>
  );
}
