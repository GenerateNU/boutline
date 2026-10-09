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
        "flex size-10 shrink-0 overflow-hidden rounded-full border border-foreground",
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
        "flex size-full items-center justify-center text-sm",
        className,
      )}
      {...props}
    >
      {children ?? <User aria-hidden className="size-5" />}
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarFallback };
