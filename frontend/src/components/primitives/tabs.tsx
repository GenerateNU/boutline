"use client";

import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";

const TabsContent = TabsPrimitive.Content;

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

interface TabsListProps extends React.ComponentProps<
  typeof TabsPrimitive.List
> {
  variant?: "line" | "stacked";
}

function TabsList({ className, variant = "line", ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn("group/tabs-list flex border-b border-border", className)}
      {...props}
    />
  );
}

interface TabsTriggerProps extends React.ComponentProps<
  typeof TabsPrimitive.Trigger
> {
  icon?: React.ReactNode;
}

function TabsTrigger({
  className,
  icon,
  children,
  ...props
}: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative flex flex-1 cursor-pointer items-center justify-center gap-3 px-4 py-3 text-sm whitespace-nowrap outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground after:opacity-0 data-[state=active]:after:opacity-100",
        "group-data-[variant=stacked]/tabs-list:flex-col group-data-[variant=stacked]/tabs-list:gap-1 group-data-[variant=stacked]/tabs-list:pt-2 group-data-[variant=stacked]/tabs-list:after:inset-x-auto group-data-[variant=stacked]/tabs-list:after:left-1/2 group-data-[variant=stacked]/tabs-list:after:h-1 group-data-[variant=stacked]/tabs-list:after:w-14 group-data-[variant=stacked]/tabs-list:after:-translate-x-1/2 group-data-[variant=stacked]/tabs-list:after:rounded-t-full",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </TabsPrimitive.Trigger>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
