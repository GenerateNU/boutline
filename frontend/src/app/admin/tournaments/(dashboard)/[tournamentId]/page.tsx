import { Skeleton } from "@/components/primitives/skeleton";

const ROW_COUNT = 6;

// A placeholder shaped like the Referees roster until a ticket defines what this tab shows.
export default function FencersTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-secondary">Fencer management is coming soon.</p>
      <Skeleton className="h-11.5 rounded-[12px]" />
      <Skeleton className="h-10 w-36 rounded-full" />
      <ul aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <li
            key={index}
            className="flex items-center gap-3 rounded-[12px] border border-outline bg-card p-4 shadow-sm"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
            <Skeleton className="h-6 w-12 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}
