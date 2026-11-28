"use client";

import { useEffect, useState } from "react";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { Button } from "@/components/primitives/button";
import { Checkbox } from "@/components/primitives/checkbox";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { RatingBadge } from "@/components/primitives/rating-badge";
import { SearchBar } from "@/components/primitives/search-bar";
import { Skeleton } from "@/components/primitives/skeleton";
import { Text } from "@/components/primitives/text";
import { ratingLabel } from "@/features/competitor/lib/rating-label";
import { listEventCompetitors } from "@/features/competitor/services/listEventCompetitors";
import type { Competitor } from "@/types/competitor";
import { errorMessage } from "@/utils/error-message";

import type { PickedFencer } from "./pool-fencer-chips";

const SKELETON_ROWS = 4;

interface PoolFencerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  eventId: string;
  excludedIds: string[];
  selected: PickedFencer[];
  onConfirm: (picked: PickedFencer[]) => void;
}

function competitorName({ firstName, lastName }: Competitor) {
  return `${firstName} ${lastName}`;
}

// Mounted only while the modal is open, so each opening reloads and restarts from the caller's selection.
function PoolFencerPickerBody({
  onOpenChange,
  tournamentId,
  eventId,
  excludedIds,
  selected,
  onConfirm,
}: Omit<PoolFencerPickerProps, "open">) {
  // null while loading.
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null);
  const [checked, setChecked] = useState(() => new Map(selected.map(({ id, name }) => [id, name])));
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    listEventCompetitors(tournamentId, eventId)
      .then((found) => {
        if (!ignore) {
          setCompetitors(found);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setCompetitors([]);
          setError(errorMessage(err));
        }
      });
    return () => {
      ignore = true;
    };
  }, [tournamentId, eventId]);

  const term = search.trim().toLowerCase();
  const rows = (competitors ?? []).filter(
    (competitor) =>
      competitor.checkedInAt !== null &&
      !excludedIds.includes(competitor.id) &&
      competitorName(competitor).toLowerCase().includes(term),
  );

  function toggle(competitor: Competitor, on: boolean) {
    const next = new Map(checked);
    if (on) {
      next.set(competitor.id, competitorName(competitor));
    } else {
      next.delete(competitor.id);
    }
    setChecked(next);
  }

  function handleConfirm() {
    onConfirm([...checked].map(([id, name]) => ({ id, name })));
    onOpenChange(false);
  }

  return (
    <>
      <SearchBar
        aria-label="Search fencers"
        placeholder="Search for fencers"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ul className="-mx-1 flex max-h-96 flex-col gap-3 overflow-y-auto px-1 py-0.5 font-manrope">
        {competitors === null &&
          Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <Skeleton key={index} className="h-18 rounded-[12px]" />
          ))}
        {rows.map((competitor) => (
          <li key={competitor.id}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-[12px] border border-outline bg-card py-3.5 pr-3 pl-4 shadow-sm transition-colors hover:bg-blue-lightest">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Text variant="subtitle" className="truncate uppercase">
                  {competitorName(competitor)}
                </Text>
                <Text variant="caption" className="truncate">
                  <MockCountry /> · {competitor.team || "No club"}
                </Text>
              </div>
              <RatingBadge tone="subtle">{ratingLabel(competitor.rating, competitor.ratingYear)}</RatingBadge>
              <Checkbox
                checked={checked.has(competitor.id)}
                onCheckedChange={(on) => toggle(competitor, on === true)}
                aria-label={competitorName(competitor)}
              />
            </label>
          </li>
        ))}
        {competitors !== null && rows.length === 0 && !error && (
          <li>
            <Text variant="muted">No checked-in fencers available.</Text>
          </li>
        )}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-dark">
          {error}
        </p>
      )}
      <ModalFooter>
        <Button type="button" onClick={handleConfirm}>
          Confirm edits
        </Button>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </ModalFooter>
    </>
  );
}

function PoolFencerPicker({ open, onOpenChange, ...props }: PoolFencerPickerProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add Fencers to Pool">
      <PoolFencerPickerBody onOpenChange={onOpenChange} {...props} />
    </Modal>
  );
}

export { PoolFencerPicker };
