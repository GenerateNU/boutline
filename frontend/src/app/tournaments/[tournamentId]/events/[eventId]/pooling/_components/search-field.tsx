import { Search } from "lucide-react";

import { Input } from "@/components/primitives/input";

type SearchFieldProps = Omit<React.ComponentProps<"input">, "type" | "className">;

export function SearchField(props: SearchFieldProps) {
  return (
    <div className="relative">
      <Input type="search" className="h-11.5 rounded-[12px] border-outline bg-card pr-10 shadow-sm placeholder:text-neutral-secondary" {...props} />
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-neutral-secondary"
      />
    </div>
  );
}
