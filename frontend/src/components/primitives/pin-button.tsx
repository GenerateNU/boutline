import { cva, type VariantProps } from "class-variance-authority";
import { Pin } from "lucide-react";

import { Button } from "@/components/primitives/button";

const pinButtonVariants = cva("rounded-[12px] shadow-md", {
  variants: {
    variant: {
      outline:
        "border-outline text-neutral-secondary aria-pressed:border-blue aria-pressed:bg-blue-lightest aria-pressed:text-blue",
      primary: "",
      obsidian: "bg-obsidian hover:bg-obsidian",
    },
    size: {
      sm: "size-11.5 [&_svg]:size-6",
      default: "size-17.5 [&_svg]:size-11.25",
    },
  },
  defaultVariants: {
    variant: "outline",
    size: "default",
  },
});

const buttonVariant = {
  outline: "outline",
  primary: "filled",
  obsidian: "filled",
} as const;

interface PinButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof pinButtonVariants> {
  active?: boolean;
}

function PinButton({
  className,
  variant,
  size,
  active,
  children,
  ...props
}: PinButtonProps) {
  return (
    <Button
      type="button"
      variant={buttonVariant[variant ?? "outline"]}
      size="icon"
      data-slot="pin-button"
      aria-pressed={active}
      className={pinButtonVariants({ variant, size, className })}
      {...props}
    >
      {children ?? <Pin aria-hidden />}
    </Button>
  );
}

export { PinButton };
