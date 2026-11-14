import { NavigationBar } from "@/components/primitives/navigation/navigation-bar";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

const TABS: (TournamentStatus | undefined)[] = [undefined, "ended", "active", "pending"];

interface StatusTabsProps {
  basePath: string;
  status?: TournamentStatus;
}

function StatusTabs({ basePath, status }: StatusTabsProps) {
  return (
    <NavigationBar
      aria-label="Tournament status"
      surface="light"
      items={TABS.map((tab) => ({
        label: tab ? statusLabels[tab] : "All",
        href: tab ? `${basePath}?status=${tab}` : basePath,
        active: tab === status,
      }))}
    />
  );
}

export { StatusTabs };
