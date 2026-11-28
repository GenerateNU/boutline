"use client";

import { useParams } from "next/navigation";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";

import { BackButton } from "@/components/primitives/back-button";
import { Card } from "@/components/primitives/card";
import { Skeleton } from "@/components/primitives/skeleton";
import { TabPageOnly } from "@/components/primitives/tab-page-only";
import { Text } from "@/components/primitives/text";

import { EventDashboardTabNav } from "./[eventId]/_components/event-dashboard-tab-nav";

const CARD_COUNT = 3;

// Covers both the events list and the event layout below it, which fetches: an event draws
// its header and tabs while that loads, and each tab's own skeleton follows.
export default function EventsLoading() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId?: string }>();

  if (!eventId) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="sr-only">
          Loading events
        </p>
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <Card key={index} orientation="horizontal" className="gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Loading event
      </p>
      <TabPageOnly basePath={`/admin/tournaments/${tournamentId}/events/${eventId}`}>
        <div className="flex flex-col gap-2 font-manrope">
          <BackButton href={`/admin/tournaments/${tournamentId}/events`} className="self-start">
            Events
          </BackButton>
          <div className="flex items-center justify-between gap-2">
            <Text variant="caption">Event Management Dashboard</Text>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4" />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div className="flex items-center gap-1 text-neutral-secondary">
              <ScheduleOutlined className="size-4 shrink-0" aria-hidden />
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="flex items-center gap-1 text-neutral-secondary">
              <GroupOutlined className="size-4 shrink-0" aria-hidden />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </TabPageOnly>
      <EventDashboardTabNav />
    </div>
  );
}
