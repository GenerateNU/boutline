import { cn } from "cn";

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const RING = { cx: 20, cy: 20, r: RADIUS, fill: "none", strokeWidth: 4 };

interface CircularProgressProps extends React.ComponentProps<"svg"> {
  value: number;
}

function CircularProgress({
  className,
  value,
  ...props
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <svg
      data-slot="circular-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      viewBox="0 0 40 40"
      className={cn("size-10 -rotate-90", className)}
      {...props}
    >
      <circle {...RING} className="stroke-border" />
      <circle
        {...RING}
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
        className="stroke-foreground"
      />
    </svg>
  );
}

export { CircularProgress };
