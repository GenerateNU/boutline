"use client";

import { ChevronDown, Funnel, Search, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
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
        <Button
          type="button"
          variant="outline"
          aria-label="Filter tournaments"
          className="h-12 gap-1 rounded-lg bg-background px-2.5"
        >
          <Funnel className="size-5! text-brand" />
          <ChevronDown />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-mobile flex-col gap-5 rounded-t-3xl bg-background px-4 pt-4 pb-8 font-satoshi">
          <Dialog.Title className="text-xl font-semibold">Filter</Dialog.Title>
          <Dialog.Description className="sr-only">
            Narrow the tournament list
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="text"
              size="icon"
              aria-label="Close"
              className="absolute top-2 right-2"
            >
              <X aria-hidden className="size-5!" />
            </Button>
          </Dialog.Close>

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
              <Button
                type="reset"
                variant="text"
                className="h-auto px-0 font-bold underline hover:bg-transparent"
              >
                Clear all
              </Button>
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
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold">{label}</p>
      <div className="flex items-center gap-3 border border-brand py-3 pr-3 pl-4 focus-within:ring-2 focus-within:ring-ring">
        <Input
          type="search"
          aria-label={label}
          placeholder={`Search ${label.toLowerCase()}`}
          className="h-auto flex-1 rounded-none border-0 px-0 text-brand placeholder:text-brand focus-visible:ring-0"
        />
        <Search className="size-6 shrink-0" />
      </div>
    </div>
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
