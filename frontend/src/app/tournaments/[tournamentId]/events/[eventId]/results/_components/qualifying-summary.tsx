import { StatTile } from "@/components/primitives/stat-tile";
import { DotSeparator } from "./dot-separator";

interface QualifyingSummaryProps {
  qualifiers: number;
  disqualifiers: number;
  qualifiedPercent: number;
}

function QualifyingSummary({ qualifiers, disqualifiers, qualifiedPercent }: QualifyingSummaryProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5 text-sm text-charcoal">
        <span>{qualifiers} Qualifiers</span>
        <DotSeparator />
        <span>{disqualifiers} Disqualifiers</span>
      </div>
      <StatTile className="w-42.5" label="fencers qualified" value={`${qualifiedPercent}%`} />
    </div>
  );
}

export { QualifyingSummary };
