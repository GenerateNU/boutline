import Link from "next/link";

import type { Bout } from "../_data/bouts";

type BoutListProps = {
  bouts: Bout[];
  eventPath: string;
};

function BoutList({ bouts, eventPath }: BoutListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {bouts.map(({ id, round, left, right }) => (
        <li key={id}>
          <Link
            href={`${eventPath}/bout/${id}`}
            className="flex flex-col gap-1 rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
          >
            <span className="text-xs text-muted-foreground">{round}</span>
            <span className="text-sm">
              {left.name}{" "}
              <span className="font-medium">
                {left.score} – {right.score}
              </span>{" "}
              {right.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export { BoutList };
