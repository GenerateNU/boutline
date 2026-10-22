import { ListFilter, Search } from "lucide-react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";

interface PoolSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function PoolSearch({ value, onChange }: PoolSearchProps) {
  return (
    <div className="flex gap-2">
      <div role="search" className="relative flex-1">
        <Input
          type="search"
          aria-label="Search pools"
          placeholder="Enter search text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 rounded-md border-brand pr-10"
        />
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-brand"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Filter (not available yet)"
        className="size-12 shrink-0 rounded-md border-brand text-brand"
      >
        <ListFilter aria-hidden />
      </Button>
    </div>
  );
}
