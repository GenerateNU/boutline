import { ListFilter, X } from "lucide-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";
import { cn } from "cn";

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
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={active ? "Filter pools (filters applied)" : "Filter pools"}
          className={cn("size-12 shrink-0 rounded-md border-brand text-brand", active && "bg-brand text-primary-foreground")}
        >
          <ListFilter aria-hidden />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 mx-auto flex max-h-dvh w-full max-w-mobile flex-col gap-5 overflow-y-auto rounded-t-3xl bg-background px-4 pt-4 pb-8"
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
