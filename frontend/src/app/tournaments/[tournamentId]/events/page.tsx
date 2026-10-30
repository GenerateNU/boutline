import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Chip } from "@/components/primitives/chip";
import { Section } from "@/components/primitives/section";
import { getSessionToken } from "@/features/auth/services/session";

const events = [
  { id: "1", name: "Y14 Men's Foil", time: "Sat 8:00 AM", status: "Past" },
  { id: "2", name: "Cadet Women's Épée", time: "Sat 10:30 AM", status: "Live" },
  { id: "3", name: "Junior Mixed Sabre", time: "Sat 1:00 PM", status: "Upcoming" },
  { id: "4", name: "Senior Men's Épée Team", time: "Sun 9:00 AM", status: "Upcoming" },
];

interface EventsTabProps extends PageProps<"/tournaments/[tournamentId]/events"> {}

export default async function EventsTab({ params }: EventsTabProps) {
  const [{ tournamentId }, sessionToken] = await Promise.all([params, getSessionToken()]);

  return (
    <Section title="Events Tab" className="flex flex-col gap-4">
      {sessionToken && (
        <Button asChild className="self-start rounded-2xl">
          <Link href={`/admin/tournament/new/event?tournamentId=${tournamentId}`}>
            Add event
          </Link>
        </Button>
      )}
      <ul className="flex flex-col gap-3">
        {events.map(({ id, name, time, status }) => (
          <li key={id}>
            <Link
              href={`/tournaments/${tournamentId}/events/${id}`}
              className="flex items-center justify-between gap-4 rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
            >
              <p className="flex flex-col gap-1">
                <span className="text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{time}</span>
              </p>
              <Chip className="rounded-full text-xs">{status}</Chip>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
