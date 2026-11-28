"use client";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { ListCard } from "@/components/primitives/list-card";
import { RatingBadge } from "@/components/primitives/rating-badge";
import { Text } from "@/components/primitives/text";
import { ratingLabel } from "@/features/competitor/lib/rating-label";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import type { Competitor } from "@/types/competitor";

interface FencerCardProps {
  competitor: Competitor;
  // Replaces the link to the fencer's page, e.g. to open a dialog about them.
  onSelect?: () => void;
  // Shown instead of the chevron when `onSelect` is set.
  selectIcon?: React.ReactNode;
}

function FencerCard({ competitor, onSelect, selectIcon }: FencerCardProps) {
  const { id, eventId, tournamentId, firstName, lastName, rating, ratingYear, team } = competitor;
  const { isPinned, togglePin } = usePinnedItems();
  const pinned = isPinned("fencer", id);
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
      badge={<RatingBadge tone={pinned ? "filled" : "subtle"}>{ratingLabel(rating, ratingYear)}</RatingBadge>}
      href={onSelect ? undefined : href || undefined}
      onSelect={onSelect}
      selectIcon={selectIcon}
      pinned={pinned}
      onTogglePin={() => togglePin("fencer", id)}
    />
  );
}

export { FencerCard };
