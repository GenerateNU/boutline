import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";

import { pluralize } from "@/lib/pluralize";
import { ImportedCompetitor } from "@/types/competitor-import";

import { formatRating } from "../tournament-draft-helpers";

// The parser accepts a row with only a member number, so the name can be blank.
function fencerName({ firstName, lastName, memberNumber }: ImportedCompetitor) {
  return [lastName, firstName].filter(Boolean).join(", ") || `Member #${memberNumber}`;
}

interface EventFencerListProps {
  fencers: ImportedCompetitor[];
}

function EventFencerList({ fencers }: EventFencerListProps) {
  if (fencers.length === 0) {
    return (
      <p className="text-xs text-neutral-secondary">
        No fencers yet. Upload a CSV above to add them.
      </p>
    );
  }

  return (
    <details className="group/fencers rounded-md border border-outline">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-obsidian">
        {fencers.length} {pluralize(fencers.length, "fencer")}
        <ExpandMoreOutlined
          aria-hidden
          className="size-4 text-neutral-secondary transition-transform group-open/fencers:rotate-180"
        />
      </summary>
      <ul className="divide-y divide-outline border-t border-outline">
        {fencers.map((fencer, index) => (
          <li key={`${fencer.memberNumber}-${index}`} className="flex items-center gap-3 px-3 py-2 text-sm">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-obsidian">{fencerName(fencer)}</span>
              <span className="truncate text-xs text-neutral-secondary">
                {fencer.club || "Unattached"}
              </span>
            </div>
            <span className="font-mono text-xs text-neutral-secondary">{formatRating(fencer)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export { EventFencerList };
