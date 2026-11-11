import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { ListCard } from "@/components/primitives/list-card";
import { pluralize } from "@/lib/pluralize";
import type { Team } from "@/types/competitor";

interface ClubCardProps {
  team: Team;
  href?: string;
  pinned?: boolean;
}

function ClubCard({ team, ...props }: ClubCardProps) {
  return (
    <ListCard
      title={team.name}
      description={
        <>
          <MockCountry /> &middot; {pluralize(team.competitorCount, "fencer")}
        </>
      }
      {...props}
    />
  );
}

export { ClubCard };
