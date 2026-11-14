import Link from "next/link";
import { cn } from "cn";

import type { TableauBout } from "../../_types/tableau";
import { BracketFencerRow } from "./bracket-fencer-row";
import { rowStyles } from "./bout-row-styles";

interface BracketMatchProps {
  bout: TableauBout;
  href: string;
  dimmed: boolean; // true when it doesn't match a search
  matched?: boolean; // true when it matches a non-empty search
}

function BracketMatch({ bout, href, dimmed = false, matched = false }: BracketMatchProps) {
  const live = bout.status === "active";
  const [topStyle, bottomStyle] = rowStyles(bout);

  return (
    <Link
      href={href}
      className={cn(
        "block w-full rounded-lg bg-card px-3 shadow-md transition-colors hover:bg-muted",
        matched && "h-27 border-2 border-blue-vivid",
        !matched && live && "h-26.75 border-[1.5px] border-accent-green",
        !matched && !live && "h-26.5 border border-outline",
        {"relative after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-obsidian/20": dimmed}
      )}
    >
      {live && <span className="sr-only">Live</span>}
      <div className="flex h-full flex-col divide-y divide-outline">
        <BracketFencerRow fencer={bout.top} score={bout.topScore} {...topStyle} />
        <BracketFencerRow fencer={bout.bottom} score={bout.bottomScore} {...bottomStyle} />
      </div>
    </Link>
  );
}

export { BracketMatch };
