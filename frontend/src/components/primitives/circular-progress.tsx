import { cn } from "cn";

const radius = 16;
const circumference = 2 * Math.PI * radius;
const ring = { cx: 20, cy: 20, r: radius, fill: "none", strokeWidth: 4 };

type CircularProgressProps = React.ComponentProps<"svg"> & {
  value: number;
};

function CircularProgress({
  className,
  value,
  ...props
}: CircularProgressProps) {
  return (
    <svg
      data-slot="circular-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      viewBox="0 0 40 40"
      className={cn("size-10 -rotate-90", className)}
      {...props}
    >
      <circle {...ring} className="stroke-border" />
      <circle
        {...ring}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
        className="stroke-foreground"
      />
    </svg>
  );
}

export { CircularProgress };
