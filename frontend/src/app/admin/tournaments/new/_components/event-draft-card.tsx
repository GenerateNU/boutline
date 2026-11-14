import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import { cn } from "cn";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { pluralize } from "@/lib/pluralize";

import { EventDraft } from "../_types/tournament-draft";
import { EventDraftFields } from "./event-draft-fields";
import { EventDraftSummary } from "./event-draft-summary";
import { EventFencerList } from "./event-fencer-list";

interface EventDraftCardProps {
  event: EventDraft;
  number: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<EventDraft>) => void;
  onRemove?: () => void;
}

function EventDraftCard({ event, number, expanded, onToggle, onChange, onRemove }: EventDraftCardProps) {
  const title = `Event ${number}`;
  const subtitle = [event.name.trim() || "Untitled", `${event.fencers.length} ${pluralize(event.fencers.length, "fencer")}`].join(" · ");

  return (
    <Card role="group" aria-label={title} className="gap-4 shadow-none">
      <div className="flex items-center gap-2">
        <h3 className="flex min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className="-m-2 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md p-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-blue-lighter"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold text-obsidian">{title}</span>
              {expanded ? null : <span className="truncate text-xs text-neutral-secondary">{subtitle}</span>}
            </span>
            <ExpandMoreOutlined
              aria-hidden
              className={cn("size-5 shrink-0 text-neutral-secondary transition-transform", expanded && "rotate-180")}
            />
          </button>
        </h3>
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

      {expanded ? (
        <>
          {event.saved ? (
            <EventDraftSummary event={event} onEdit={() => onChange({ saved: false })} />
          ) : (
            <EventDraftFields event={event} onChange={onChange} />
          )}
          <EventFencerList fencers={event.fencers} />
        </>
      ) : null}
    </Card>
  );
}

export { EventDraftCard };
