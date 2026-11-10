import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { ListCard } from "@/components/primitives/list-card";
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
          <MockCountry /> · {team.competitorCount}{" "}
          {team.competitorCount === 1 ? "fencer" : "fencers"}
        </>
      }
      {...props}
    />
  );
}

export { ClubCard };
