import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";

import { BackButton } from "@/components/primitives/back-button";
import { Skeleton } from "@/components/primitives/skeleton";

import { DashboardTabNav } from "./_components/dashboard-tab-nav";

// The route group exists so this boundary covers the dashboard layout without covering the list or /new.
export default function TournamentDashboardLoading() {
  return (
    <div className="flex flex-col">
      <span role="status" className="sr-only">
        Loading tournament
      </span>
      <header className="mx-auto flex w-full max-w-mobile flex-col gap-2 px-4 pt-4 pb-6 font-manrope">
        <BackButton href="/admin/tournaments" className="self-start">
          All tournaments
        </BackButton>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-neutral-secondary">Tournament Management Dashboard</p>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-7 w-3/4" />
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center gap-1 text-xs text-neutral-secondary">
            <CalendarTodayOutlined className="size-4 shrink-0" aria-hidden />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-secondary">
            <LocationOnOutlined className="size-4 shrink-0" aria-hidden />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </header>
      <DashboardTabNav />
    </div>
  );
}
