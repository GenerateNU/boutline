import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const ratingBadgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        filled: "bg-blue text-white",
        subtle: "border border-blue-light bg-blue-lightest text-blue",
      },
    },
    defaultVariants: {
      tone: "filled",
    },
  },
);

interface RatingBadgeProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof ratingBadgeVariants> {}

function RatingBadge({ tone, className, ...props }: RatingBadgeProps) {
  return (
    <div
      data-slot="rating"
      className={cn(ratingBadgeVariants({ tone, className }))}
      {...props}
    />
  );
}

export { RatingBadge };
