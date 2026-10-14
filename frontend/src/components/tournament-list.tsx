import Link from "next/link";

import { Chip } from "@/components/primitives/chip";
import { type Tournament } from "@/lib/tournaments";

// The vocabulary the events list already uses, rather than the raw enum.
const statusLabel: Record<Tournament["status"], string> = {
  pending: "Upcoming",
  active: "Live",
  end: "Past",
};

function TournamentList({ tournaments }: { tournaments: Tournament[] }) {
  if (tournaments.length === 0) {
    return <p className="text-sm text-muted-foreground">No tournaments yet.</p>;
  }

  // TODO(#107): replace with List/ListItem from vindema/lofi-components-4,
  // status Chip as `trailing`. ListItem wraps children in one truncating <p>,
  // so the stacked name + date needs rethinking first, and these rows are
  // links while ListItem is a plain <li>.
  return (
    <ul className="flex flex-col gap-3">
      {tournaments.map(({ id, name, status, start_time }) => (
        <li key={id}>
          <Link
            href={`/tournaments/${id}`}
            className="flex items-center justify-between gap-4 rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">
                {start_time?.slice(0, 10) ?? "Date TBC"}
              </span>
            </span>
            <Chip className="shrink-0 rounded-full text-xs">
              {statusLabel[status]}
            </Chip>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export { TournamentList };
