import { cn } from "cn";

const radius = 16;
const circumference = 2 * Math.PI * radius;
const ring = { cx: 20, cy: 20, r: radius, fill: "none", strokeWidth: 4 };

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
      <circle {...ring} className="stroke-border" />
      <circle
        {...ring}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        className="stroke-foreground"
      />
    </svg>
  );
}

export { CircularProgress };
