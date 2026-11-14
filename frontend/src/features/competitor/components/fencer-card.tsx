import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { ListCard } from "@/components/primitives/list-card";
import { RatingBadge } from "@/components/primitives/rating-badge";
import { Text } from "@/components/primitives/text";
import type { Competitor } from "@/types/competitor";

interface FencerCardProps {
  competitor: Competitor;
  pinned?: boolean;
  onTogglePin?: () => void;
}

function FencerCard({ competitor, pinned, onTogglePin }: FencerCardProps) {
  const { id, eventId, tournamentId, firstName, lastName, rating, ratingYear, team } = competitor;
  // A fencer not entered in a tournament yet has no page to link to.
  const href =
    tournamentId &&
    `/tournaments/${encodeURIComponent(tournamentId)}/events/${encodeURIComponent(eventId)}/fencers/${encodeURIComponent(id)}`;

  return (
    <ListCard
      title={`${firstName} ${lastName}`}
      description={
        <Text variant="caption" className="truncate uppercase">
          <MockCountry /> &middot; {team || "No club"}
        </Text>
      }
      badge={<RatingBadge tone={pinned ? "filled" : "subtle"}>{rating}{ratingYear}</RatingBadge>}
      href={href || undefined}
      pinned={pinned}
      onTogglePin={onTogglePin}
    />
  );
}

export { FencerCard };
