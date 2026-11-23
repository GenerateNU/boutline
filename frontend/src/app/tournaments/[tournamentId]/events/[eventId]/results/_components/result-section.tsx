import type { EventStatus } from "@/features/event/types/event";
import type { ResultFencer } from "../../_types/results";
import { ResultFencerCard } from "./result-fencer-card";

interface ResultSectionProps {
  title: string;
  fencers: ResultFencer[];
  eventName: string;
  eventStatus: EventStatus;
}

function ResultSection({ title, fencers, eventName, eventStatus }: ResultSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-charcoal">{title}</h2>
      <ul className="flex flex-col gap-3">
        {fencers.map((fencer) => (
          <li key={fencer.id}>
            <ResultFencerCard fencer={fencer} eventName={eventName} eventStatus={eventStatus} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export { ResultSection };
