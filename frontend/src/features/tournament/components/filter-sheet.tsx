"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

const distances = ["10 miles", "25 miles", "50 miles", "100 miles"];
const statusOrder: TournamentStatus[] = ["ended", "active", "pending"];

const chipClassName =
  "flex-none rounded-sm border border-brand px-3.5 py-1.5 text-brand first:border-l data-[state=on]:bg-brand data-[state=on]:text-background";

function FilterSheet() {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [distance, setDistance] = useState("");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setStatus(searchParams.get("status") ?? "");
        }
        setOpen(next);
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Filter tournaments"
          className="shrink-0 cursor-pointer"
        >
          <Image src="/filter.svg" alt="" width={55} height={48} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-mobile flex-col gap-5 rounded-t-3xl bg-background px-4 pt-4 pb-8 font-satoshi">
          <Dialog.Title className="text-xl font-semibold">Filter</Dialog.Title>
          <Dialog.Description className="sr-only">
            Narrow the tournament list
          </Dialog.Description>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute top-4 right-4 cursor-pointer"
            >
              <X aria-hidden className="size-5" />
            </button>
          </Dialog.Close>

          {/* A form so "Clear all" can reset the uncontrolled club and country
              fields natively; the chip groups are cleared in onReset. */}
          <form
            className="flex flex-col gap-5"
            onReset={() => {
              setStatus("");
              setDistance("");
            }}
            onSubmit={(event) => {
              event.preventDefault();
              setFilters({ status });
              setOpen(false);
            }}
          >
            <SearchField label="Club" />
            <SearchField label="Country" />

            <ChipGroup label="Distance" value={distance} onValueChange={setDistance}>
              {distances.map((value) => (
                <SegmentedButtonItem key={value} value={value} className={chipClassName}>
                  {value}
                </SegmentedButtonItem>
              ))}
            </ChipGroup>

            <ChipGroup label="Status" value={status} onValueChange={setStatus}>
              {statusOrder.map((value) => (
                <SegmentedButtonItem key={value} value={value} className={chipClassName}>
                  {statusLabels[value]}
                </SegmentedButtonItem>
              ))}
            </ChipGroup>

            <div className="flex items-center justify-between gap-4">
              <button
                type="reset"
                className="cursor-pointer text-sm font-bold underline"
              >
                Clear all
              </button>
              <Button
                type="submit"
                className="w-69 rounded-sm bg-brand font-normal text-background hover:bg-brand/90"
              >
                Show Tournaments
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SearchField({ label }: { label: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-bold">{label}</span>
      <span className="flex items-center gap-3 border border-brand py-3 pr-3 pl-4">
        <input
          type="search"
          placeholder={`Search ${label.toLowerCase()}`}
          className="flex-1 text-sm text-brand outline-none placeholder:text-brand"
        />
        <Image src="/search.svg" alt="" width={24} height={24} />
      </span>
    </label>
  );
}

type ChipGroupProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
};

function ChipGroup({ label, value, onValueChange, children }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold">{label}</p>
      <SegmentedButton
        type="single"
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        className="flex flex-wrap gap-2 overflow-visible rounded-none border-0"
      >
        {children}
      </SegmentedButton>
    </div>
  );
}

export { FilterSheet };
