"use client";

import Link from "next/link";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import { cn } from "cn";

import { Button } from "@/components/primitives/button";

type BackButtonSize = "sm" | "default" | "lg";

const SIZE_CLASSES: Record<BackButtonSize, string> = {
  sm: "pr-3 pl-2",
  default: "pr-4 pl-3 [&_svg]:size-5",
  lg: "pr-5 pl-4 [&_svg]:size-6",
};

interface BackButtonProps extends React.ComponentProps<typeof Link> {
  size?: BackButtonSize;
  disabled?: boolean;
}

function BackButton({
  size = "default",
  disabled,
  className,
  children = "Back",
  ...props
}: BackButtonProps) {
  return (
    <Button
      asChild
      variant="text"
      size={size}
      className={cn(
        "gap-1 aria-disabled:pointer-events-none aria-disabled:text-disabled-foreground",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {/* Links can't be disabled natively, so block keyboard activation too. */}
      <Link
        data-slot="back-button"
        {...props}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : props.tabIndex}
        onClick={disabled ? (event) => event.preventDefault() : props.onClick}
      >
        <ChevronLeftOutlined aria-hidden />
        {children}
      </Link>
    </Button>
  );
}

export { BackButton };
