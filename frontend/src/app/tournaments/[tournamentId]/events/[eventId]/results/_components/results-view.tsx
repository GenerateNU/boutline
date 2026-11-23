import { Text } from "@/components/primitives/text";
import type { EventStatus } from "@/features/event/types/event";
import { splitQualifying } from "../../_services/split-qualifying";
import type { ResultFencer } from "../../_types/results";
import { QualifyingSummary } from "./qualifying-summary";
import { ResultSection } from "./result-section";

interface ResultsViewProps {
  fencers: ResultFencer[];
  eventName: string;
  eventStatus: EventStatus;
  action?: React.ReactNode;
}

function ResultsView({ fencers, eventName, eventStatus, action }: ResultsViewProps) {
  if (fencers.length === 0) {
    return <Text variant="muted">No pool results yet.</Text>;
  }

  const { drawn, qualifiers, disqualifiers, qualifiedPercent } = splitQualifying(fencers);
  const section = { eventName, eventStatus };

  if (!drawn) {
    return (
      <div className="flex flex-col gap-3">
        {action}
        <Text variant="muted">Qualifiers are set once the tableau is drawn.</Text>
        <ResultSection title="Standings" fencers={fencers} {...section} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <QualifyingSummary
        qualifiers={qualifiers.length}
        disqualifiers={disqualifiers.length}
        qualifiedPercent={qualifiedPercent}
      />
      {action}
      {qualifiers.length > 0 && <ResultSection title="Qualifiers" fencers={qualifiers} {...section} />}
      {disqualifiers.length > 0 && (
        <ResultSection title="Disqualifiers" fencers={disqualifiers} {...section} />
      )}
    </div>
  );
}

export { ResultsView };
