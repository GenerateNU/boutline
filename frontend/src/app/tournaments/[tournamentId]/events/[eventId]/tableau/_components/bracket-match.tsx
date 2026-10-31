import Link from "next/link";
import { cn } from "cn";

import type { TableauBout } from "../../_types/tableau";
import { FencerRow } from "./fencer-row";

interface BracketMatchProps {
  bout: TableauBout;
  href: string;
  dimmed: boolean; // true when it doesn't match a search
}

function BracketMatch({ bout, href, dimmed = false }: BracketMatchProps) {
  return (
    <Link
      href={href}
      className={cn(
        "block w-full rounded-md border border-foreground px-3 py-1 transition-colors hover:bg-muted",
        {"opacity-40": dimmed}
      )}
    >
      <div className="border-b border-muted-foreground/40">
        <FencerRow fencer={bout.top} score={bout.topScore} />
      </div>
      <FencerRow fencer={bout.bottom} score={bout.bottomScore} />
    </Link>
  );
}

export { BracketMatch };