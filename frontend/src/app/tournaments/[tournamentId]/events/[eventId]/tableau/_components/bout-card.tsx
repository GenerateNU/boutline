import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import Link from "next/link";
import { cn } from "cn";

import type { TableauBout } from "../../_types/tableau";
import { BracketFencerRow } from "./bracket-fencer-row";
import { rowStyles } from "./bout-row-styles";

interface BoutCardProps {
  bout: TableauBout;
  title: string;
  nextLabel?: string;
  href: string;
}

function BoutCard({ bout, title, nextLabel, href }: BoutCardProps) {
  const live = bout.status === "active";
  const [topStyle, bottomStyle] = rowStyles(bout);

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg bg-card px-3 shadow-md transition-colors hover:bg-muted",
        live ? "border-[1.5px] border-accent-green" : "border border-outline",
      )}
    >
      {live && <span className="sr-only">Live</span>}
      <p className="flex h-8 items-center justify-center border-b border-outline text-[11px] text-neutral-secondary">
        {title}
      </p>
      <div className="flex h-13 border-b border-outline">
        <BracketFencerRow fencer={bout.top} score={bout.topScore} {...topStyle} />
      </div>
      <div className={cn("flex h-13", nextLabel && "border-b border-outline")}>
        <BracketFencerRow fencer={bout.bottom} score={bout.bottomScore} {...bottomStyle} />
      </div>
      {nextLabel && (
        <p className="flex h-8 items-center gap-1 text-xs text-neutral-secondary">
          Winner <ArrowForwardOutlined aria-hidden className="size-3" /> {nextLabel}
        </p>
      )}
    </Link>
  );
}

export { BoutCard };
