import { Skeleton } from "@/components/primitives/skeleton";

const FIELD_COUNT = 5;

// A placeholder shaped like a settings form until a ticket defines what this tab shows.
export default function SettingsTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-secondary">Tournament settings are coming soon.</p>
      <div
        aria-hidden
        className="flex flex-col gap-5 rounded-[12px] border border-outline bg-card p-4 shadow-sm"
      >
        {Array.from({ length: FIELD_COUNT }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-11 rounded-md" />
          </div>
        ))}
        <Skeleton className="h-10 w-28 self-end rounded-full" />
      </div>
    </div>
  );
}
