import type { TableauBout, TableauRound } from "../../_types/tableau";
import { BoutCard } from "./bout-card";
import { boutTitle, matchesQuery } from "./tableau-utils";

interface TableauListItemProps {
  bout: TableauBout;
  round: TableauRound;
  nextRound?: TableauRound;
  boutBasePath: string;
}

function TableauListItem({ bout, round, nextRound, boutBasePath }: TableauListItemProps) {
  const nextLabel = nextRound && boutTitle(nextRound, Math.ceil(bout.number / 2));
  return (
    <li>
      <BoutCard
        bout={bout}
        title={boutTitle(round, bout.number)}
        nextLabel={nextLabel}
        href={`${boutBasePath}/${bout.id}`}
      />
    </li>
  );
}

interface TableauListProps {
  rounds: TableauRound[];
  selectedRoundId: string;
  query: string;
  boutBasePath: string;
}

function TableauList({ rounds, selectedRoundId, query, boutBasePath }: TableauListProps) {
  const roundIndex = Math.max(
    rounds.findIndex((round) => round.id === selectedRoundId),
    0,
  );
  const round = rounds[roundIndex];
  const nextRound = rounds[roundIndex + 1];
  const bouts = round.bouts.filter((bout) => matchesQuery(bout, query));

  if (round.bouts.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No bouts in this round yet.</p>;
  }
  if (bouts.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No bouts match your search.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {bouts.map((bout) => (
        <TableauListItem
          key={bout.id}
          bout={bout}
          round={round}
          nextRound={nextRound}
          boutBasePath={boutBasePath}
        />
      ))}
    </ul>
  );
}

export { TableauList };