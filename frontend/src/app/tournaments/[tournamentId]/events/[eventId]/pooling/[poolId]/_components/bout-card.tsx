import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { cn } from "cn";

import { Button } from "@/components/primitives/button";
import type { BoutStatus } from "@/types/bout";

import type { PoolBoutDetail, PoolBoutSide } from "../../_types/pool-bout-detail";

interface BoutCardProps {
  detail: PoolBoutDetail;
  fencersPath: string;
  onShowAll: () => void;
}

const statusLabels: Record<BoutStatus, string> = {
  ended: "Final",
  active: "In Progress",
  upcoming: "Upcoming",
};

function FencerRow({ side }: { side: PoolBoutSide }) {
  const won = side.result === "V";

  return (
    <div className={cn("flex items-center gap-3 rounded-md p-3", won ? "bg-green-light" : "bg-surface")}>
      {side.result && (
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-[4px] text-xs font-semibold text-white",
            won ? "bg-green" : "bg-neutral-muted",
          )}
        >
          {side.result}
        </span>
      )}
      <div className="flex-1">
        <p className="text-base font-medium">{side.name}</p>
        <p className="text-xs text-neutral-secondary">{side.team}</p>
      </div>
      <span className={cn("text-xl font-semibold", won ? "text-green-dark" : "text-neutral-secondary")}>
        {side.score ?? "–"}
      </span>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col px-3 py-2">
      <span className="text-sm font-bold">{value}</span>
      <span className="text-xs text-neutral-secondary">{label}</span>
    </div>
  );
}

export function BoutCard({ detail, fencersPath, onShowAll }: BoutCardProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-[12px] border border-outline bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <p className="text-xs font-semibold uppercase text-neutral-secondary">
            Bout {detail.number} of {detail.total}
          </p>
          <h2 id={headingId} className="text-xl font-semibold">
            Pool bout
          </h2>
        </div>
        <Button type="button" variant="text" size="sm" onClick={onShowAll}>
          All bouts
        </Button>
      </div>
      {detail.sides.map((side) => (
        <FencerRow key={side.competitorId} side={side} />
      ))}
      <div className="grid grid-cols-3 divide-x divide-outline rounded-md border border-outline">
        <InfoCell label="Status" value={statusLabels[detail.status]} />
        <InfoCell label="Pool" value={detail.poolNumber} />
        <InfoCell label="Strip" value={detail.strip} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {detail.sides.map((side) => (
          <Button key={side.competitorId} asChild variant="outline" size="sm">
            <Link href={fencersPath}>
              {side.name}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
