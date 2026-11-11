import { cn } from "cn";
import { Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Logo } from "@/components/primitives/logo";

interface NavbarProps extends React.ComponentProps<"header"> {
  onMenuClick?: () => void;
}

function Navbar({ onMenuClick, className, ...props }: NavbarProps) {
  return (
    <header
      data-slot="navbar"
      className={cn(
        "relative flex h-10 w-full items-center justify-between overflow-hidden bg-obsidian pr-3 shadow-md [--slant:1.1rem]",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-y-0 left-0 w-3/4 bg-blue [clip-path:polygon(0_0,100%_0,calc(100%-var(--slant))_100%,0_100%)]" />
      <div className="absolute inset-y-0 left-[calc(75%+0.375rem-var(--slant))] w-[calc(var(--slant)+0.25rem)] bg-accent-green [clip-path:polygon(var(--slant)_0,100%_0,calc(100%-var(--slant))_100%,0_100%)]" />
      <Link href="/" className="relative ml-5 rounded-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Logo className="h-6 text-white" />
      </Link>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Open menu"
        onClick={onMenuClick}
        className="relative text-white hover:bg-white/10"
      >
        <Menu aria-hidden className="size-6!" />
      </Button>
    </header>
  );
}

export { Navbar };
