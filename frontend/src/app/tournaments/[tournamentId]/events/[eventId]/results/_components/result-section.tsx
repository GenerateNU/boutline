import type { EventStatus } from "@/features/event/types/event";
import type { ResultFencer } from "../../_types/results";
import { ResultHeading } from "./result-heading";
import { ResultList } from "./result-list";

interface ResultSectionProps {
  title: string;
  fencers: ResultFencer[];
  eventName: string;
  eventStatus: EventStatus;
}

function ResultSection({ title, ...list }: ResultSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <ResultHeading>{title}</ResultHeading>
      <ResultList {...list} />
    </section>
  );
}

export { ResultSection };
