import EditOutlined from "@mui/icons-material/EditOutlined";

import { Button } from "@/components/primitives/button";
import { formatShortDate } from "@/features/tournament/lib/format-short-date";

import { TournamentDraft } from "../_types/tournament-draft";

interface TournamentDraftSummaryProps {
  draft: TournamentDraft;
  onEdit: () => void;
}

function TournamentDraftSummary({ draft, onEdit }: TournamentDraftSummaryProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-obsidian">{draft.name}</p>
        <p className="text-xs text-neutral-secondary">
          {draft.venue} · {draft.location}
        </p>
        <p className="text-xs text-neutral-secondary">
          {formatShortDate(draft.date)} at {draft.time} · {draft.authority}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onEdit}>
        <EditOutlined aria-hidden />
        Edit
      </Button>
    </div>
  );
}

export { TournamentDraftSummary };
