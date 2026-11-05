import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/primitives/button";

type BackButtonSize = "sm" | "default" | "lg";

const sizeClasses: Record<BackButtonSize, string> = {
  sm: "pr-3 pl-2",
  default: "pr-4 pl-3 [&_svg]:size-5",
  lg: "pr-5 pl-4 [&_svg]:size-6",
};

interface BackButtonProps extends React.ComponentProps<typeof Link> {
  size?: BackButtonSize;
}

function BackButton({
  size = "default",
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
        sizeClasses[size],
        className,
      )}
    >
      <Link data-slot="back-button" {...props}>
        <ChevronLeft aria-hidden />
        {children}
      </Link>
    </Button>
  );
}

export { BackButton };
