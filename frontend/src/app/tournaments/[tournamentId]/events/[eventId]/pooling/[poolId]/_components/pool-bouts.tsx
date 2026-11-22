"use client";

import { useState } from "react";

import { PoolTable } from "@/features/pool/components/pool-table";

import { PoolStandingsTable } from "../../_components/pool-standings-table";
import { poolBoutDetail } from "../../_services/pool-bout-detail";
import { boutsTable } from "../../_services/pool-table-data";
import { poolTitle } from "../../_services/pool-title";
import type { PoolBoard } from "../../_types/pool-board";

import { BoutCard } from "./bout-card";

interface PoolBoutsProps {
  pool: PoolBoard;
  fencersPath: string;
  boutsPath: string;
  canReferee: boolean;
}

export function PoolBouts({ pool, fencersPath, boutsPath, canReferee }: PoolBoutsProps) {
  const [selectedBoutId, setSelectedBoutId] = useState<string | null>(null);
  const detail = selectedBoutId ? poolBoutDetail(pool, selectedBoutId) : null;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[repeat(2,24rem)] lg:items-start">
      <PoolTable
        caption={`${poolTitle(pool)} bouts`}
        data={boutsTable(pool)}
        selectedBoutId={selectedBoutId}
        onSelectBout={(boutId) => setSelectedBoutId((current) => (current === boutId ? null : boutId))}
      />
      <div className="flex flex-col gap-6">
        <div aria-live="polite" className="flex flex-col gap-3">
          {detail && (
            <>
              <p className="text-center text-sm text-neutral-secondary">Showing the bout you tapped</p>
              <BoutCard
                detail={detail}
                fencersPath={fencersPath}
                refereePath={canReferee ? `${boutsPath}/${detail.id}/referee` : null}
                onShowAll={() => setSelectedBoutId(null)}
              />
            </>
          )}
        </div>
        {!detail && <PoolStandingsTable pool={pool} />}
      </div>
    </div>
  );
}
