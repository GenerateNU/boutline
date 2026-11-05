import { cn } from "cn";

interface TagProps extends React.ComponentProps<"div"> {
  icon?: React.ReactNode;
}

function Tag({ icon, className, children, ...props }: TagProps) {
  return (
    <div
      data-slot="tag"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm bg-blue-lightest py-1 pr-2.5 pl-2 text-xs font-medium whitespace-nowrap text-blue [&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </div>
  );
}

export { Tag };
