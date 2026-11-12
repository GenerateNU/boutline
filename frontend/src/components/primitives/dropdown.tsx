import { cn } from "cn";

import { labelVariants } from "@/components/primitives/label";

interface DropdownSectionProps {
  title?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

interface DropdownItemProps extends React.ComponentProps<"li"> {
  icon?: React.ReactNode;
}

function Dropdown({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown"
      className={cn(
        "divide-y divide-outline rounded-lg border border-outline bg-background px-1.5 shadow-md",
        className,
      )}
      {...props}
    />
  );
}

function DropdownSection({
  title,
  icon,
  children,
}: DropdownSectionProps) {
  return (
    <section data-slot="dropdown-section" aria-label={title} className="py-2">
      {title && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-neutral-muted [&_svg]:size-3.5">
          {icon}
          <p className="text-xs font-medium tracking-wide uppercase">{title}</p>
        </div>
      )}
      <ul>{children}</ul>
    </section>
  );
}

function DropdownItem({
  icon,
  className,
  children,
  ...props
}: DropdownItemProps) {
  return (
    <li
      data-slot="dropdown-item"
      className={labelVariants({ className: cn("hover:bg-surface", className) })}
      {...props}
    >
      {icon}
      {children}
    </li>
  );
}

interface DropdownOptionProps extends React.ComponentProps<"button"> {
  selected?: boolean;
}

// A row the user can pick, e.g. a suggestion under a search bar.
function DropdownOption({ selected, className, ...props }: DropdownOptionProps) {
  return (
    <li data-slot="dropdown-option">
      <button
        type="button"
        aria-pressed={selected}
        className={labelVariants({
          className: cn(
            "w-full cursor-pointer text-left outline-none hover:bg-surface focus-visible:bg-surface aria-pressed:font-semibold",
            className,
          ),
        })}
        {...props}
      />
    </li>
  );
}

function DropdownMessage({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dropdown-message"
      className={cn("px-2 py-2 text-sm text-neutral-muted", className)}
      {...props}
    />
  );
}

export { Dropdown, DropdownItem, DropdownMessage, DropdownOption, DropdownSection };
