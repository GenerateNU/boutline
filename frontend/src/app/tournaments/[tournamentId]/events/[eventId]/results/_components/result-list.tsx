import type { EventStatus } from "@/features/event/types/event";
import type { ResultFencer } from "../../_types/results";
import { ResultFencerCard } from "./result-fencer-card";

interface ResultListProps {
  fencers: ResultFencer[];
  eventName: string;
  eventStatus: EventStatus;
}

function ResultList({ fencers, eventName, eventStatus }: ResultListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {fencers.map((fencer) => (
        <li key={fencer.id}>
          <ResultFencerCard fencer={fencer} eventName={eventName} eventStatus={eventStatus} />
        </li>
      ))}
    </ul>
  );
}

export { ResultList };
