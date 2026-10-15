import { Menu } from "lucide-react";
import { cn } from "cn";

import { Avatar, AvatarFallback } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";

type ProfileTopAppBarProps = {
  title: string;
  className?: string;
};

function ProfileTopAppBar({ title, className }: ProfileTopAppBarProps) {
  return (
    <header
      className={cn(
        "grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center border border-foreground bg-background px-4",
        className,
      )}
    >
      <div className="flex justify-start">
        <Button variant="text" size="icon" aria-label="Open menu">
          <Menu />
        </Button>
      </div>
      <h1 className="truncate text-lg">{title}</h1>
      <div className="flex justify-end">
        <Avatar>
          <AvatarFallback />
        </Avatar>
      </div>
    </header>
  );
}

export { ProfileTopAppBar };