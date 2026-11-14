import EditOutlined from "@mui/icons-material/EditOutlined";

import { Button } from "@/components/primitives/button";
import { formatShortDate } from "@/features/tournament/lib/format-short-date";

import { EventDraft } from "../_types/tournament-draft";

interface EventDraftSummaryProps {
  event: EventDraft;
  onEdit: () => void;
}

function EventDraftSummary({ event, onEdit }: EventDraftSummaryProps) {
  const details = [event.weapon, event.genderMix, event.ageCategory, event.ratingLevel].join(" · ");

  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-xs text-neutral-secondary">{details}</p>
        <p className="text-xs text-neutral-secondary">
          {formatShortDate(event.date)} at {event.time}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onEdit}>
        <EditOutlined aria-hidden />
        Edit
      </Button>
    </div>
  );
}

export { EventDraftSummary };
