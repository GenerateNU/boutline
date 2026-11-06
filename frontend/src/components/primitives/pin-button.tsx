import { cn } from "cn";
import { Pin } from "lucide-react";

import { Button } from "@/components/primitives/button";

const variants = {
  outline: {
    variant: "outline",
    className:
      "border-outline text-neutral-secondary aria-pressed:border-blue aria-pressed:bg-blue-lightest aria-pressed:text-blue",
  },
  primary: { variant: "filled", className: "" },
  obsidian: { variant: "filled", className: "bg-obsidian hover:bg-obsidian" },
} as const;

const sizes = {
  sm: "size-11.5 [&_svg]:size-6",
  default: "size-17.5 [&_svg]:size-11.25",
};

interface PinButtonProps extends React.ComponentProps<"button"> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  active?: boolean;
}

function PinButton({
  className,
  variant = "outline",
  size = "default",
  active,
  children,
  ...props
}: PinButtonProps) {
  return (
    <Button
      type="button"
      variant={variants[variant].variant}
      size="icon"
      data-slot="pin-button"
      aria-pressed={active}
      className={cn(
        "rounded-[12px] shadow-md",
        variants[variant].className,
        sizes[size],
        className,
      )}
      {...props}
    >
      {children ?? <Pin aria-hidden />}
    </Button>
  );
}

export { PinButton };
