import { Background } from "@/components/primitives/background";
import { Card } from "@/components/primitives/card";
import { PoolTable } from "@/features/pool/components/pool-table";

import { SAMPLE_POOL } from "../_services/sample-pool";

export function PoolsFeature() {
  return (
    <section className="relative isolate overflow-hidden text-obsidian">
      <Background version={7} />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
        <div className="flex flex-col gap-4">
          <h2 className="text-4xl leading-10 font-semibold">
            Built for the strip, not the spreadsheet.
          </h2>
          <p className="text-sm">
            Everything a fencer, coach, or referee checks between bouts, in one place.
          </p>
        </div>
        <Card className="gap-3">
          <PoolTable caption="Sample pool bouts" data={SAMPLE_POOL} />
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-medium">Pools at a glance</h3>
            <p className="text-sm text-neutral-secondary">
              See every bout in the pool as a grid. Tap any square for the full score, strip, and
              live status.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
