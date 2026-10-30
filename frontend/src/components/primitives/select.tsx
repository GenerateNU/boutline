import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const selectVariants = cva(
  "h-10 w-full cursor-pointer px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        outline: "rounded-md border border-foreground bg-background",
        filled: "rounded-full bg-chip",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

type SelectProps = React.ComponentProps<"select"> &
  VariantProps<typeof selectVariants> & { placeholder?: string };

function Select({ className, variant, placeholder, children, ...props }: SelectProps) {
  return (
    <select
      data-slot="select"
      className={cn(selectVariants({ variant, className }))}
      defaultValue={placeholder === undefined ? undefined : ""}
      {...props}
    >
      {placeholder !== undefined && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}

export { Select };
