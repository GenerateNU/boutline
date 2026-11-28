import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Link from "next/link";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { Card } from "@/components/primitives/card";
import { RatingBadge } from "@/components/primitives/rating-badge";
import { Text } from "@/components/primitives/text";
import { ratingLabel } from "@/features/competitor/lib/rating-label";

import type { EventResult } from "../_types/event-result";

interface RankingRowProps {
  result: EventResult;
  fencerHref: string;
}

function RankingRow({ result, fencerHref }: RankingRowProps) {
  const { place, first_name, last_name, club, rating, rating_year } = result;
  return (
    <Link href={fencerHref} className="block rounded-[12px]">
      <Card
        orientation="horizontal"
        className="gap-2 py-3.5 pr-3 font-manrope transition-colors hover:bg-blue-lightest"
      >
        <Text variant="title" className="min-w-5 shrink-0">
          {place}
        </Text>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text variant="subtitle" className="truncate uppercase">
            {first_name} {last_name}
          </Text>
          <Text variant="caption" className="truncate uppercase">
            <MockCountry /> &middot; {club || "No club"}
          </Text>
        </div>
        <RatingBadge tone="subtle">{ratingLabel(rating, rating_year)}</RatingBadge>
        <ChevronRightOutlined aria-hidden className="size-6 shrink-0 text-neutral-muted" />
      </Card>
    </Link>
  );
}

export { RankingRow };
