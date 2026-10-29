import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Chip } from "@/components/primitives/chip";
import type { Competitor } from "@/types/competitor";

interface FencerCardProps {
  competitor: Competitor;
  href: string;
}

function FencerCard({ competitor, href }: FencerCardProps) {
  const { firstName, lastName, rating, team } = competitor;

  return (
    <Link href={href} className="block rounded-md">
      <Card
        orientation="horizontal"
        className="gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted"
      >
        <CardHeader className="gap-0.5">
          <CardTitle className="text-base font-normal uppercase">
            {firstName} {lastName}
          </CardTitle>
          <CardDescription className="text-xs uppercase">
            <MockCountry /> - {team || "No club"}
          </CardDescription>
        </CardHeader>
        <Chip className="rounded-sm border-foreground bg-foreground px-1.5 py-0.5 text-xs text-background">
          {rating}
        </Chip>
        <ChevronRight aria-hidden className="size-4 shrink-0" />
      </Card>
    </Link>
  );
}

export { FencerCard };
