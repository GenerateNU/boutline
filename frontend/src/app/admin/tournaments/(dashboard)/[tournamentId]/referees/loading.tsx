"use client";

import { useParams } from "next/navigation";

import { Card, CardTitle } from "@/components/primitives/card";
import { Skeleton } from "@/components/primitives/skeleton";
import { SearchForm } from "@/features/tournament/components/search-form";

const ROW_COUNT = 5;

// A client component so it can read the id from the URL; loading screens get no route params.
export default function RefereesLoading() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading referees
      </span>
      <SearchForm
        action={`/admin/tournaments/${tournamentId}/referees`}
        label="Search referees"
        placeholder="e.g. Yan Wang"
      />
      <Skeleton className="h-10 w-32 self-start rounded-md" />
      <Card className="gap-0 px-3.5 pt-3.5 pb-1">
        <CardTitle className="border-b border-outline pb-3 text-xl text-obsidian">
          Referees:
        </CardTitle>
        <ul aria-hidden className="divide-y divide-outline">
          {Array.from({ length: ROW_COUNT }, (_, index) => (
            <li key={index} className="flex items-center gap-3 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
              <Skeleton className="h-8 min-w-20 rounded-md" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
