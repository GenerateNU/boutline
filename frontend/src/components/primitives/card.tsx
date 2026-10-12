import { cn } from "cn";

type CardProps = React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal";
};

function Card({ className, orientation = "vertical", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-orientation={orientation}
      className={cn(
        "group/card relative flex gap-4 border border-foreground bg-card p-4 text-card-foreground data-[orientation=horizontal]:items-center data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function CardMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-media"
      className={cn(
        "aspect-4/3 w-full shrink-0 overflow-hidden bg-muted group-data-[orientation=horizontal]/card:aspect-square group-data-[orientation=horizontal]/card:w-28",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid min-w-0 flex-1 auto-rows-min gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("truncate text-2xl font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("truncate text-base", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-center justify-self-end group-data-[orientation=vertical]/card:absolute group-data-[orientation=vertical]/card:top-6 group-data-[orientation=vertical]/card:right-6",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardMedia,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
};
