import Link from "next/link";

import type { Bout } from "../_types/bouts";

interface BoutListProps {
  bouts: Bout[];
  eventPath: string;
}

export function BoutList({ bouts, eventPath }: BoutListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {bouts.map(({ id, round, left, right }) => (
        <li key={id}>
          <Link
            href={`${eventPath}/bout/${id}`}
            className="flex flex-col gap-1 rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
          >
            <p className="text-xs text-muted-foreground">{round}</p>
            <p className="text-sm">
              {left.name}{" "}
              <span className="font-medium">
                {left.score} - {right.score}
              </span>{" "}
              {right.name}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
