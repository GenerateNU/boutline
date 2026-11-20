import { BackButton } from "@/components/primitives/back-button";
import { Skeleton } from "@/components/primitives/skeleton";

import { TournamentTabNav } from "./_components/tournament-tab-nav";

// The route group exists so this boundary covers the tabs' layout, which fetches the
// tournament, without covering event pages. Only the name shimmers; each tab's own
// skeleton follows once the layout resolves.
export default function TournamentLoading() {
  return (
    <div className="flex flex-col">
      <span role="status" className="sr-only">
        Loading tournament
      </span>
      <TournamentTabNav />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20 font-manrope">
        <BackButton href="/tournaments" className="self-start">
          All tournaments
        </BackButton>
        <Skeleton className="h-7 w-2/3" />
      </div>
    </div>
  );
}
