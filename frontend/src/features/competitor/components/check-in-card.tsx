"use client";

import { useState, useTransition } from "react";

import { Card } from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import { StatusBadge } from "@/components/primitives/status-badge";
import { listCompetitors, type CompetitorQuery } from "@/features/competitor/services/listCompetitors";
import { setCheckedIn } from "@/features/competitor/services/setCheckedIn";
import type { Competitor } from "@/types/competitor";

interface CheckInCardProps {
  competitors: Competitor[];
  // Checked-in fencers across every page, as the server counted them.
  checkedInTotal: number;
  // Admins in edit mode get checkboxes; everyone else sees Present / Absent.
  editable: boolean;
  // The list scrolls inside the card and loads the next page of `source` near its bottom.
  source: CompetitorQuery;
  total: number;
  pageSize: number;
}

export function CheckInCard({
  competitors,
  checkedInTotal,
  editable,
  source,
  total,
  pageSize,
}: CheckInCardProps) {
  const [more, setMore] = useState<Competitor[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [shownCompetitors, setShownCompetitors] = useState(competitors);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Fresh server data (paging, search, a refresh) replaces any local toggles.
  if (shownCompetitors !== competitors) {
    setShownCompetitors(competitors);
    setOverrides({});
    setMore([]);
  }

  const rows = [...competitors, ...more];

  const isCheckedIn = (c: Competitor) => overrides[c.id] ?? c.checkedInAt !== null;
  // The server total, moved by every local toggle that differs from what was loaded.
  const checkedInCount = rows.reduce(
    (count, c) => count + Number(isCheckedIn(c)) - Number(c.checkedInAt !== null),
    checkedInTotal,
  );

  async function loadMore(list: HTMLUListElement) {
    const nearBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 48;
    if (loadingMore || !nearBottom || rows.length >= total) {
      return;
    }
    setLoadingMore(true);
    try {
      const { data } = await listCompetitors(source, pageSize, rows.length);
      setMore((m) => [...m, ...data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load more fencers");
    } finally {
      setLoadingMore(false);
    }
  }

  function toggle(competitor: Competitor) {
    const previous = isCheckedIn(competitor);
    setError(null);
    setOverrides((o) => ({ ...o, [competitor.id]: !previous }));
    startTransition(async () => {
      try {
        await setCheckedIn(competitor.id, !previous);
      } catch (err) {
        setOverrides((o) => ({ ...o, [competitor.id]: previous }));
        setError(err instanceof Error ? err.message : "Couldn't update check-in");
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Check in:</h3>
        <span className="text-xs text-muted-foreground">{checkedInCount} checked in</span>
      </div>
      <ul
        className="max-h-96 divide-y divide-border overflow-y-auto"
        onScroll={(e) => loadMore(e.currentTarget)}
      >
        {rows.map((competitor) => {
          const checked = isCheckedIn(competitor);
          const name = `${competitor.firstName} ${competitor.lastName}`;
          return (
            <li key={competitor.id} className="flex items-center justify-between py-3 text-sm">
              <span className="uppercase">{name}</span>
              {editable ? (
                <Checkbox
                  checked={checked}
                  aria-label={`Check in ${name}`}
                  disabled={pending}
                  onCheckedChange={() => toggle(competitor)}
                />
              ) : (
                <StatusBadge status={checked ? "present" : "absent"} />
              )}
            </li>
          );
        })}
        {loadingMore && <li className="py-3 text-center text-xs text-muted-foreground">Loading…</li>}
      </ul>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
