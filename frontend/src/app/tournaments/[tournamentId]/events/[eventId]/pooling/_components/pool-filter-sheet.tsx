import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { FilterButton } from "@/components/primitives/filter-button";

import { hasActiveFilters } from "../_services/apply-pool-filters";
import type { PoolFilters } from "../_types/pool-filters";

import { PoolFilterForm } from "./pool-filter-form";

interface PoolFilterSheetProps {
  filters: PoolFilters;
  poolNumbers: number[];
  onApply: (filters: PoolFilters) => void;
}

export function PoolFilterSheet({ filters, poolNumbers, onApply }: PoolFilterSheetProps) {
  const active = hasActiveFilters(filters);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <FilterButton
          active={active}
          aria-label={active ? "Filter pools (filters applied)" : "Filter pools"}
        />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/50" />
        {/* The scroll lock hides the scrollbar and pads the page by its width; ending the sheet at
            that padding keeps it centered under the page column instead of the full window. */}
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed right-[var(--removed-body-scroll-bar-size,0px)] bottom-0 left-0 mx-auto flex max-h-dvh w-full max-w-mobile flex-col gap-5 overflow-y-auto rounded-t-3xl bg-background px-4 pt-4 pb-8"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-semibold">Filter</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <PoolFilterForm initial={filters} poolNumbers={poolNumbers} onApply={onApply} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
