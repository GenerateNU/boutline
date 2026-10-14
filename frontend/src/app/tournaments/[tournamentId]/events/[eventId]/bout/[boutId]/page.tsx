import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/primitives/button";
import { Section } from "@/components/primitives/section";

import { findBout } from "../../_services/bouts";

interface BoutPageProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/bout/[boutId]"> {}

export default async function BoutPage({ params }: BoutPageProps) {
  const { tournamentId, eventId, boutId } = await params;
  const bout = findBout(boutId);
  if (!bout) notFound();

  const { round, left, right, audit } = bout;

  return (
    <>
      <Section title={`Bout · ${round}`}>
        <div className="grid grid-cols-2 gap-3">
          {[left, right].map((fencer, index) => (
            <div
              key={index}
              className="flex flex-col gap-1 rounded-md border border-foreground px-4 py-3"
            >
              <span className="text-3xl font-medium">{fencer.score}</span>
              <span className="text-sm">{fencer.name}</span>
              <span className="text-xs text-muted-foreground">{fencer.club}</span>
            </div>
          ))}
        </div>
        <Button asChild className="rounded-full">
          <Link
            href={`/tournaments/${tournamentId}/events/${eventId}/bout/${boutId}/referee`}
          >
            Referee view
          </Link>
        </Button>
      </Section>

      <Section title="Score audit">
        <ol className="flex flex-col divide-y divide-border text-sm">
          {audit.map(({ time, scorer, leftScore, rightScore }) => (
            <li
              key={`${leftScore}-${rightScore}`}
              className="flex items-center justify-between gap-4 py-2"
            >
              <span className="text-xs text-muted-foreground tabular-nums">{time}</span>
              <span className="flex-1">
                Touch {scorer === "left" ? left.name : right.name}
              </span>
              <span className="font-medium tabular-nums">
                {leftScore} - {rightScore}
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
