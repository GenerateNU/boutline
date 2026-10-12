import { cn } from "cn";

function List({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="list"
      className={cn("border border-foreground", className)}
      {...props}
    />
  );
}

type ListItemProps = React.ComponentProps<"li"> & {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
};

function ListItem({
  className,
  leading,
  trailing,
  children,
  ...props
}: ListItemProps) {
  return (
    <li
      data-slot="list-item"
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm",
        className,
      )}
      {...props}
    >
      {leading}
      <p className="flex-1 truncate">{children}</p>
      {trailing}
    </li>
  );
}

export { List, ListItem };
