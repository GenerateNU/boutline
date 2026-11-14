"use client";

import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import { useId, useState } from "react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/primitives/collapsible";
import { pluralize } from "@/lib/pluralize";

import { EventDraft, FencerDraft } from "../_types/tournament-draft";
import { hasIncompleteFencers, missingEventFields } from "../tournament-draft-helpers";
import { EventDraftFields } from "./event-draft-fields";
import { EventDraftSummary } from "./event-draft-summary";
import { EventFencerList } from "./event-fencer-list";

interface EventDraftCardProps {
  event: EventDraft;
  title: string;
  expanded: boolean;
  tournamentSaved: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onChange: (patch: Partial<EventDraft>) => void;
  onRemove?: () => void;
  onAddFencer: () => void;
  onChangeFencer: (fencerId: string, patch: Partial<FencerDraft>) => void;
  onRemoveFencer: (fencerId: string) => void;
}

function EventDraftCard({
  event,
  title,
  expanded,
  tournamentSaved,
  onExpandedChange,
  onChange,
  onRemove,
  onAddFencer,
  onChangeFencer,
  onRemoveFencer,
}: EventDraftCardProps) {
  const [attempted, setAttempted] = useState(false);

  // Saving checks only this card and its fencers; the browser's required check
  // runs for the whole form on submit. A failed save marks what's missing.
  function handleSave() {
    if (missingEventFields(event).length > 0 || hasIncompleteFencers(event)) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    onChange({ saved: true });
  }

  const fencerList = (
    <EventFencerList
      fencers={event.fencers}
      editable={!event.saved}
      showErrors={attempted}
      onAdd={onAddFencer}
      onChange={onChangeFencer}
      onRemove={onRemoveFencer}
    />
  );
  const fencerCount = `${event.fencers.length} ${pluralize(event.fencers.length, "fencer")}`;
  const titleId = useId();
  return (
    <Card role="group" aria-label={title} className="gap-0 shadow-none">
      <Collapsible open={expanded} onOpenChange={onExpandedChange}>
        <div className="relative flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 id={titleId} className="truncate text-base font-semibold text-obsidian">
              {title}
            </h3>
            {/* Shown open or closed, so the header doesn't change height mid-animation. */}
            <p className="truncate text-xs text-neutral-secondary">{fencerCount}</p>
          </div>
          {/* A button can't hold the heading, so the trigger is the chevron and its
              ::after stretches over the header to keep the whole row clickable. */}
          <CollapsibleTrigger
            aria-labelledby={titleId}
            className="group/trigger flex shrink-0 cursor-pointer items-center outline-none after:absolute after:-inset-2 after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-blue-lighter"
          >
            <ExpandMoreOutlined
              aria-hidden
              className="size-5 text-neutral-secondary transition-transform group-data-[state=open]/trigger:rotate-180"
            />
          </CollapsibleTrigger>
          {onRemove ? (
            <Button
              type="button"
              variant="text"
              size="icon"
              aria-label={`Remove ${title}`}
              onClick={onRemove}
              className="relative -m-2 text-neutral-secondary [&_svg]:size-5"
            >
              <DeleteOutlined aria-hidden />
            </Button>
          ) : null}
        </div>

        {/* The negative margin and matching padding leave room for focus rings,
            which the animation's overflow-hidden would otherwise clip. */}
        <CollapsibleContent className="-mx-1 -mb-1 px-1 pb-1">
          <div className="flex flex-col gap-4 pt-4">
            {event.saved ? (
              <>
                <EventDraftSummary event={event} onEdit={() => onChange({ saved: false })} />
                {fencerList}
              </>
            ) : (
              <EventDraftFields
                event={event}
                canSave={tournamentSaved}
                attempted={attempted}
                onChange={onChange}
                onSave={handleSave}
              >
                {fencerList}
              </EventDraftFields>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export { EventDraftCard };
