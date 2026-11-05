import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/primitives/button";

// Overrides on top of Button's outline variant.
const filterButtonVariants = cva(
  "gap-0.5 border-outline text-neutral-secondary disabled:border-outline disabled:bg-surface disabled:text-neutral-muted disabled:shadow-none aria-pressed:border-blue aria-pressed:bg-blue-lightest aria-pressed:text-blue [&_svg]:size-6",
  {
    variants: {
      size: {
        sm: "size-9 rounded-lg",
        default: "size-11.5 rounded-[12px]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

interface FilterButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof filterButtonVariants> {
  active?: boolean;
  dropdown?: boolean;
}

function FilterButton({
  className,
  size,
  active,
  dropdown,
  children,
  ...props
}: FilterButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      data-slot="filter-button"
      aria-pressed={active}
      className={filterButtonVariants({ size, className })}
      {...props}
    >
      {children ?? <SlidersHorizontal aria-hidden />}
      {dropdown ? <ChevronDown aria-hidden className="size-3.5!" /> : null}
    </Button>
  );
}

export { FilterButton };
