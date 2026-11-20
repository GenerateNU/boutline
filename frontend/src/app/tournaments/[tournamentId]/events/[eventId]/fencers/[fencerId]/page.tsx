import { BackButton } from "@/components/primitives/back-button";
import { Section } from "@/components/primitives/section";

interface EventFencerPageProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/fencers/[fencerId]"> {}

export default async function EventFencerPage({ params }: EventFencerPageProps) {
  const { tournamentId, eventId } = await params;

  return (
    <>
      <BackButton href={`/tournaments/${tournamentId}/events/${eventId}/fencers`} className="self-start">
        Fencers
      </BackButton>
      <Section title="Event Fencer" className="flex flex-col gap-4">
        <p>This is the event fencer page.</p>
        <p>a fencer&apos;s status, pool, and strip in this event</p>
      </Section>
    </>
  );
}
