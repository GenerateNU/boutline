"use client";

import { cn } from "cn";
import { User } from "lucide-react";
import { Avatar as AvatarPrimitive } from "radix-ui";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "flex size-7.5 shrink-0 overflow-hidden rounded-full border border-outline bg-surface shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center text-xs text-obsidian",
        className,
      )}
      {...props}
    >
      {children ?? <User aria-hidden className="size-1/2" />}
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarFallback };
