import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { TableauBout } from "../../_types/tableau";
import { FencerRow } from "./fencer-row";

interface BoutCardProps {
  bout: TableauBout;
  title: string;
  nextLabel?: string;
  href: string;
}

function BoutCard({ bout, title, nextLabel, href }: BoutCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
    >
      <p className="border-b border-muted-foreground/40 pb-2">{title}</p>
      <div className="border-b border-muted-foreground/40">
        <FencerRow fencer={bout.top} score={bout.topScore} showSeed />
      </div>
      <FencerRow fencer={bout.bottom} score={bout.bottomScore} showSeed />
      {nextLabel && (
        <p className="flex items-center gap-1 border-t border-muted-foreground/40 pt-2 text-sm">
          Winner <ArrowRight aria-hidden className="size-4" /> {nextLabel}
        </p>
      )}
    </Link>
  );
}

export { BoutCard };