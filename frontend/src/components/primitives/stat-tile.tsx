import { cn } from "cn";

interface StatTileProps extends React.ComponentProps<"div"> {
  label: string;
  value: React.ReactNode;
}

function StatTile({ label, value, className, ...props }: StatTileProps) {
  return (
    <div
      data-slot="stat-tile"
      className={cn(
        "flex flex-col gap-0.5 rounded-[12px] border border-outline bg-background px-3 pt-2.5 pb-3 font-semibold whitespace-nowrap shadow-sm",
        className,
      )}
      {...props}
    >
      <p className="text-[11px] leading-4 tracking-[0.08em] text-neutral-secondary uppercase">
        {label}
      </p>
      <p className="text-2xl text-obsidian">{value}</p>
    </div>
  );
}

export { StatTile };
