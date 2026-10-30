import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const inputVariants = cva(
  "h-10 w-full px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
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

type InputProps = React.ComponentProps<"input"> & VariantProps<typeof inputVariants>;

function Input({ className, variant, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
