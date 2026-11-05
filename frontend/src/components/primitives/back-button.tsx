import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/primitives/button";

function BackButton({
  className,
  children = "Back",
  ...props
}: React.ComponentProps<typeof Link>) {
  return (
    <Button
      asChild
      variant="text"
      className={cn("gap-1 pr-4 pl-3 [&_svg]:size-5", className)}
    >
      <Link data-slot="back-button" {...props}>
        <ChevronLeft aria-hidden />
        {children}
      </Link>
    </Button>
  );
}

export { BackButton };
