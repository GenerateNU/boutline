"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import { Avatar as AvatarPrimitive } from "radix-ui";

const avatarVariants = cva(
  "flex shrink-0 overflow-hidden rounded-full border border-foreground bg-surface",
  {
    variants: {
      size: {
        sm: "size-5",
        md: "size-6.25",
        lg: "size-7.5",
      },
    },
    defaultVariants: {
      size: "lg",
    },
  },
);

interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

function Avatar({ className, size, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size, className }))}
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
      {children ?? <PersonOutlined aria-hidden className="size-1/2" />}
    </AvatarPrimitive.Fallback>
  );
}

export { Avatar, AvatarFallback };
