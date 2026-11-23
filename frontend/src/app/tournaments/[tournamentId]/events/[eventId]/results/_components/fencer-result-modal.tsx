"use client";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { Modal } from "@/components/primitives/modal";
import { StatTile } from "@/components/primitives/stat-tile";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import type { EventStatus } from "@/features/event/types/event";
import type { ResultFencer } from "../../_types/results";
import { DotSeparator } from "./dot-separator";

interface FencerResultModalProps {
  fencer: ResultFencer;
  eventName: string;
  eventStatus: EventStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FencerResultModal({
  fencer,
  eventName,
  eventStatus,
  open,
  onOpenChange,
}: FencerResultModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${fencer.firstName} ${fencer.lastName}`}
      className="gap-4 [&_h2]:uppercase"
    >
      <div className="-mt-3 flex items-center gap-2 text-sm text-neutral-secondary uppercase">
        <span>{fencer.club || "No club"}</span>
        <DotSeparator />
        <MockCountry />
      </div>
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-1">
          <p className="text-xs text-charcoal uppercase">{eventName}</p>
          <EventStatusBadge status={eventStatus} />
        </div>
        <div className="flex gap-4">
          <StatTile className="flex-1" label="Pool" value={fencer.pool} />
          <StatTile className="flex-1" label="Strip" value={fencer.strip ?? "—"} />
        </div>
      </div>
    </Modal>
  );
}

export { FencerResultModal };
