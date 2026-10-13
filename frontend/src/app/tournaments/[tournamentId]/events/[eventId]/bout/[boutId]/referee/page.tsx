import { notFound } from "next/navigation";

import { Section } from "@/components/primitives/section";

import { findBout } from "../../../_data/bouts";

export default async function RefereeViewPage({
  params,
}: PageProps<"/tournaments/[tournamentId]/events/[eventId]/bout/[boutId]/referee">) {
  const { boutId } = await params;
  const bout = findBout(boutId);
  if (!bout) notFound();

  return (
    <Section title="Referee view" className="flex flex-col gap-4">
      <p>
        {bout.left.name} vs {bout.right.name}
      </p>
      <p>scoring controls, cards, and the bout clock for the referee go here</p>
    </Section>
  );
}
