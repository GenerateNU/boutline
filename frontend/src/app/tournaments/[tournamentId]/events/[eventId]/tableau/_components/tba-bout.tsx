import { cn } from "cn";

interface TbaBoutProps {
  dimmed?: boolean;
}

// Stands in for a bout whose fencers aren't decided yet, e.g. the final before the semis finish.
function TbaBout({ dimmed = false }: TbaBoutProps) {
  return (
    <div
      role="group"
      aria-label="Bout to be announced"
      className={cn(
        "w-full rounded-md border border-dashed border-foreground px-3 py-1 text-muted-foreground",
        {"opacity-40": dimmed}
      )}
    >
      {[0, 1].map((side) => (
        <div
          key={side}
          className={cn("py-2", {"border-b border-muted-foreground/40": side === 0})}
        >
          <p>TBA</p>
          <p className="text-xs">TBA</p>
        </div>
      ))}
    </div>
  );
}

export { TbaBout };