import { CreateTournamentCard } from "@/features/tournament/components/create-tournament-card";
import { StatusTabs } from "@/features/tournament/components/status-tabs";
import { TournamentCardSkeleton } from "@/features/tournament/components/tournament-card-skeleton";
import { TournamentStatus } from "@/features/tournament/types/tournament";

const CARD_COUNT = 5;

interface AdminTournamentBrowserSkeletonProps {
  status?: TournamentStatus;
}

// Mirrors AdminTournamentBrowser's layout so the page doesn't jump when results arrive.
function AdminTournamentBrowserSkeleton({ status }: AdminTournamentBrowserSkeletonProps) {
  return (
    <div className="mx-auto flex w-full max-w-mobile flex-1 flex-col gap-5 px-5 pt-5 pb-6 font-manrope">
      <span role="status" className="sr-only">
        Loading tournaments
      </span>

      <CreateTournamentCard />

      <div className="flex flex-col gap-1.25 pt-1.25">
        <h1 className="px-1 text-xl font-semibold text-obsidian">Manage Tournaments</h1>
        <StatusTabs basePath="/admin/tournaments" status={status} />
      </div>

      <ul aria-hidden className="flex flex-col gap-5">
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <li key={index}>
            <TournamentCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

export { AdminTournamentBrowserSkeleton };
