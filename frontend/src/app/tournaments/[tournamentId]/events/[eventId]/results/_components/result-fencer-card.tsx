"use client";

import { useState } from "react";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { ListCard } from "@/components/primitives/list-card";
import { RatingBadge } from "@/components/primitives/rating-badge";
import { Text } from "@/components/primitives/text";
import type { EventStatus } from "@/features/event/types/event";
import type { ResultFencer } from "../../_types/results";
import { FencerResultModal } from "./fencer-result-modal";

interface ResultFencerCardProps {
  fencer: ResultFencer;
  eventName: string;
  eventStatus: EventStatus;
}

function ResultFencerCard({ fencer, eventName, eventStatus }: ResultFencerCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ListCard
        title={`${fencer.firstName} ${fencer.lastName}`}
        description={
          <Text variant="caption" className="truncate uppercase">
            <MockCountry /> &middot; {fencer.club || "No club"}
          </Text>
        }
        badge={<RatingBadge tone="subtle">{fencer.rating}</RatingBadge>}
        onSelect={() => setOpen(true)}
      />
      <FencerResultModal
        fencer={fencer}
        eventName={eventName}
        eventStatus={eventStatus}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export { ResultFencerCard };
