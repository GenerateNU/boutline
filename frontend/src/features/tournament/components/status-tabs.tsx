import { cn } from "cn";
import Link from "next/link";

import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

const tabs: (TournamentStatus | undefined)[] = [undefined, "ended", "active", "pending"];

interface StatusTabsProps {
  basePath: string;
  status?: TournamentStatus;
}

function StatusTabs({ basePath, status }: StatusTabsProps) {
  return (
    <nav aria-label="Tournament status" className="flex border-b border-outline">
      {tabs.map((tab) => (
        <Link
          key={tab ?? "all"}
          href={tab ? `${basePath}?status=${tab}` : basePath}
          aria-current={tab === status ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center gap-2 px-1 pt-2.5 text-sm whitespace-nowrap after:h-0.5 after:w-full after:rounded-t-xs",
            tab === status
              ? "font-semibold text-obsidian after:bg-accent-green"
              : "font-medium text-neutral-secondary",
          )}
        >
          {tab ? statusLabels[tab] : "All"}
        </Link>
      ))}
    </nav>
  );
}

export { StatusTabs };
