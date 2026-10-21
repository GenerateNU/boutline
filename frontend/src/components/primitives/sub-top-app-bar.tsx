import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/primitives/button";

type SubTopAppBarProps = {
  title: string;
  backHref: string;
  actions?: React.ReactNode; // icon buttons on the right; vary by screen
  className?: string;
};

function SubTopAppBar({ title, backHref, actions, className }: SubTopAppBarProps) {
  return (
    <header
      className={cn(
        "flex h-16 w-full items-center gap-2 border border-foreground bg-background px-2",
        className,
      )}
    >
      <Button asChild variant="text" size="icon">
        <Link href={backHref} aria-label="Go back">
          <ChevronLeft />
        </Link>
      </Button>
      <h2 className="flex-1 truncate text-lg">{title}</h2>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  );
}

export { SubTopAppBar };