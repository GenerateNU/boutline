import DeleteOutlined from "@mui/icons-material/DeleteOutlined";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";

import { EventDraft } from "../_types/tournament-draft";
import { EventDraftFields } from "./event-draft-fields";
import { EventDraftSummary } from "./event-draft-summary";
import { EventFencerList } from "./event-fencer-list";

interface EventDraftCardProps {
  event: EventDraft;
  number: number;
  onChange: (patch: Partial<EventDraft>) => void;
  onRemove?: () => void;
}

function EventDraftCard({ event, number, onChange, onRemove }: EventDraftCardProps) {
  const title = `Event ${number}`;

  return (
    <Card role="group" aria-label={title} className="gap-4 shadow-none">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-obsidian">{title}</h3>
        {onRemove ? (
          <Button
            type="button"
            variant="text"
            size="icon"
            aria-label={`Remove ${title}`}
            onClick={onRemove}
            className="-m-2 text-neutral-secondary [&_svg]:size-5"
          >
            <DeleteOutlined aria-hidden />
          </Button>
        ) : null}
      </div>

      {event.saved ? (
        <EventDraftSummary event={event} onEdit={() => onChange({ saved: false })} />
      ) : (
        <EventDraftFields event={event} onChange={onChange} />
      )}

      <EventFencerList fencers={event.fencers} />
    </Card>
  );
}

export { EventDraftCard };
