import { Search } from "lucide-react";

import { Input } from "@/components/primitives/input";

type SearchFieldProps = Omit<React.ComponentProps<"input">, "type" | "className">;

export function SearchField(props: SearchFieldProps) {
  return (
    <div className="relative">
      <Input type="search" className="h-12 rounded-md border-brand pr-10" {...props} />
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-brand"
      />
    </div>
  );
}
