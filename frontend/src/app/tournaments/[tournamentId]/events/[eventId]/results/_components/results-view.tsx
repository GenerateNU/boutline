import { Text } from "@/components/primitives/text";
import type { EventStatus } from "@/features/event/types/event";
import { splitQualifying } from "../../_services/split-qualifying";
import type { ResultFencer } from "../../_types/results";
import { FadingScrollArea } from "./fading-scroll-area";
import { QualifyingSummary } from "./qualifying-summary";
import { ResultHeading } from "./result-heading";
import { ResultList } from "./result-list";
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
      <ResultsLayout
        header={
          <>
            {action}
            <Text variant="muted">Qualifiers are set once the tableau is drawn.</Text>
            <ResultHeading>Standings</ResultHeading>
          </>
        }
      >
        <ResultList fencers={fencers} {...section} />
      </ResultsLayout>
    );
  }

  return (
    <ResultsLayout
      header={
        <>
          <QualifyingSummary
            qualifiers={qualifiers.length}
            disqualifiers={disqualifiers.length}
            qualifiedPercent={qualifiedPercent}
          />
          {action}
        </>
      }
    >
      {qualifiers.length > 0 && <ResultSection title="Qualifiers" fencers={qualifiers} {...section} />}
      {disqualifiers.length > 0 && (
        <ResultSection title="Disqualifiers" fencers={disqualifiers} {...section} />
      )}
    </ResultsLayout>
  );
}

interface ResultsLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
}

// The tab has a fixed height like the tableau, so the summary stays put and only
// the fencer lists scroll.
function ResultsLayout({ header, children }: ResultsLayoutProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-3">{header}</div>
      <FadingScrollArea>{children}</FadingScrollArea>
    </div>
  );
}

export { ResultsView };
