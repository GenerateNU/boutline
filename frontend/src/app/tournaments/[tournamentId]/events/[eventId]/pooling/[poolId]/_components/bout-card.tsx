import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

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

const badgeClass = "rounded-sm bg-primary px-1.5 py-1 text-xs text-primary-foreground";

function FencerRow({ side }: { side: PoolBoutSide }) {
  return (
    <div className="flex items-center gap-2">
      {side.result && <span className={badgeClass}>{side.result}</span>}
      <div className="flex-1">
        <p className="text-base">{side.name}</p>
        <p className="text-xs font-light">{side.team}</p>
      </div>
      <span className={badgeClass}>{side.score ?? "–"}</span>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-2">
      <span className="text-xs font-light">{label}</span>
      <span className="text-base font-bold">{value}</span>
    </div>
  );
}

export function BoutCard({ detail, fencersPath, onShowAll }: BoutCardProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-md border border-foreground bg-background p-4 pb-8">
      <div className="flex items-start justify-between">
        <h2 id={headingId} className="text-xl font-semibold">
          Bout
        </h2>
        <Button type="button" variant="outline" className="h-8 rounded-sm border-brand px-4 text-sm font-normal text-brand" onClick={onShowAll}>
          Show all bouts
        </Button>
      </div>
      <p className="text-xs font-bold uppercase">
        Bout {detail.number} of {detail.total}
      </p>
      {detail.sides.map((side) => (
        <FencerRow key={side.competitorId} side={side} />
      ))}
      <p className="text-xs">{detail.summary}</p>
      <div className="grid grid-cols-3 divide-x divide-neutral-500 rounded-sm border border-neutral-500">
        <InfoCell label="Status" value={statusLabels[detail.status]} />
        <InfoCell label="Pool" value={detail.poolNumber} />
        <InfoCell label="Strip" value={detail.strip} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {detail.sides.map((side) => (
          <Button key={side.competitorId} asChild variant="outline" className="h-10 rounded-sm border-brand font-normal text-brand">
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
