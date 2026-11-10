import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { ListCard } from "@/components/primitives/list-card";
import { RatingBadge } from "@/components/primitives/rating-badge";
import type { Competitor } from "@/types/competitor";

interface FencerCardProps {
  competitor: Competitor;
  href?: string;
  pinned?: boolean;
}

function FencerCard({ competitor, ...props }: FencerCardProps) {
  const { firstName, lastName, rating, team } = competitor;

  return (
    <ListCard
      title={`${firstName} ${lastName}`}
      description={
        <p className="truncate uppercase">
          <MockCountry /> · {team || "No club"}
        </p>
      }
      badge={<RatingBadge tone={props.pinned ? "filled" : "subtle"}>{rating}</RatingBadge>}
      {...props}
    />
  );
}

export { FencerCard };
