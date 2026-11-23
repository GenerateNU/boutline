import { cn } from "cn";

interface BoutLocationProps {
  location?: string;
  className?: string;
}

function BoutLocation({ location, className }: BoutLocationProps) {
  return (
    <p
      className={cn(
        "h-5 truncate text-[11px] leading-5font-semibold tracking-[0.08em] text-neutral-secondary uppercase",
        className,
      )}
    >
      {location || "TBA Location"}
    </p>
  );
}

export { BoutLocation };
