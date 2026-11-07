"use client";

import { useState } from "react";

import { PoolTable } from "../../_components/pool-table";
import { poolBoutDetail } from "../../_services/pool-bout-detail";
import { boutsTable } from "../../_services/pool-table-data";
import { poolTitle } from "../../_services/pool-title";
import type { PoolBoard } from "../../_types/pool-board";

import { BoutCard } from "./bout-card";

interface PoolBoutsProps {
  pool: PoolBoard;
  fencersPath: string;
}

export function PoolBouts({ pool, fencersPath }: PoolBoutsProps) {
  const [selectedBoutId, setSelectedBoutId] = useState<string | null>(null);
  const detail = selectedBoutId ? poolBoutDetail(pool, selectedBoutId) : null;

  return (
    <div className="flex flex-col gap-6">
      <PoolTable
        caption={`${poolTitle(pool)} bouts`}
        data={boutsTable(pool)}
        selectedBoutId={selectedBoutId}
        onSelectBout={(boutId) => setSelectedBoutId((current) => (current === boutId ? null : boutId))}
      />
      <div aria-live="polite" className="flex flex-col gap-3">
        {detail && (
          <>
            <p className="text-center text-sm">Showing the bout you tapped</p>
            <BoutCard detail={detail} fencersPath={fencersPath} onShowAll={() => setSelectedBoutId(null)} />
          </>
        )}
      </div>
    </div>
  );
}
