import { cn } from "cn";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";

import { Button } from "@/components/primitives/button";

const VARIANTS = {
  outline: {
    variant: "outline",
    className:
      "border-outline text-neutral-secondary aria-pressed:border-blue aria-pressed:bg-blue-lightest aria-pressed:text-blue",
  },
  primary: { variant: "filled", className: "" },
  obsidian: { variant: "filled", className: "bg-obsidian hover:bg-obsidian" },
  // Just the icon, for the end of a list row.
  plain: { variant: "text", className: "text-neutral-muted shadow-none aria-pressed:text-blue" },
} as const;

const SIZES = {
  xs: "size-8 rounded-md [&_svg]:size-4",
  sm: "size-11.5 [&_svg]:size-6",
  default: "size-17.5 [&_svg]:size-11.25",
};

interface PinButtonProps extends React.ComponentProps<"button"> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  active?: boolean;
  asChild?: boolean;
}

function PinButton({
  className,
  variant = "outline",
  size = "default",
  active,
  asChild,
  children,
  ...props
}: PinButtonProps) {
  return (
    <Button
      asChild={asChild}
      type={asChild ? undefined : "button"}
      variant={VARIANTS[variant].variant}
      size="icon"
      data-slot="pin-button"
      aria-pressed={active}
      className={cn(
        "rounded-[12px] shadow-md",
        VARIANTS[variant].className,
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children ?? <PushPinOutlined aria-hidden />}
    </Button>
  );
}

export { PinButton };
