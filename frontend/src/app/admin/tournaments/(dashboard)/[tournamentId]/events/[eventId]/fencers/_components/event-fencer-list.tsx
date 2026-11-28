"use client";

import EditOutlined from "@mui/icons-material/EditOutlined";
import { useState } from "react";

import { FencerCard } from "@/features/competitor/components/fencer-card";
import { listCompetitors, type CompetitorQuery } from "@/features/competitor/services/listCompetitors";
import { useInfiniteList } from "@/lib/hooks/use-infinite-list";
import type { Competitor } from "@/types/competitor";

import { EditFencerDialog } from "./edit-fencer-dialog";

interface EventFencerListProps {
  competitors: Competitor[];
  total: number;
  pageSize: number;
  query: CompetitorQuery;
  editing: boolean;
}

function EventFencerList({ competitors, total, pageSize, query, editing }: EventFencerListProps) {
  const [editingFencer, setEditingFencer] = useState<Competitor | null>(null);
  const { items, loading, hasMore, error, endRef } = useInfiniteList(competitors, total, async (offset) => {
    const { data } = await listCompetitors(query, pageSize, offset);
    return data;
  });

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((competitor) => (
          <li key={competitor.id}>
            <FencerCard
              competitor={competitor}
              onSelect={editing ? () => setEditingFencer(competitor) : undefined}
              selectIcon={editing ? <EditOutlined aria-hidden /> : undefined}
            />
          </li>
        ))}
        {loading ? (
          <li className="py-3 text-center text-xs text-muted-foreground">Loading…</li>
        ) : hasMore ? (
          <li ref={endRef} aria-hidden />
        ) : null}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <EditFencerDialog
        competitor={editingFencer}
        onOpenChange={(open) => {
          if (!open) {
            setEditingFencer(null);
          }
        }}
      />
    </>
  );
}

export { EventFencerList };
