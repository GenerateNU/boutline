import { cn } from "cn";

function StatRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-row"
      className={cn(
        "flex divide-x divide-outline overflow-hidden rounded-[12px] border border-outline bg-background",
        className,
      )}
      {...props}
    />
  );
}

interface StatProps extends React.ComponentProps<"div"> {
  label: string;
  value: React.ReactNode;
}

function Stat({ label, value, className, ...props }: StatProps) {
  return (
    <div
      data-slot="stat"
      className={cn(
        "flex min-w-0 flex-1 flex-col px-2.5 py-2 whitespace-nowrap",
        className,
      )}
      {...props}
    >
      <p className="text-sm font-semibold text-obsidian">{value}</p>
      <p className="text-xs text-neutral-secondary">{label}</p>
    </div>
  );
}

export { Stat, StatRow };
