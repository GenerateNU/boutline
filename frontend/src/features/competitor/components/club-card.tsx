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
          {/* Clubs have no stored location yet. */}
          <MockCountry /> &middot; Location TBC
        </>
      }
      {...props}
    />
  );
}

export { ClubCard };
