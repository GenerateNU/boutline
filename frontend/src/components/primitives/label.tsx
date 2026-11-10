import { cva, type VariantProps } from "class-variance-authority";

const labelVariants = cva(
  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-obsidian [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        plain: "",
        subtle: "bg-surface",
      },
    },
    defaultVariants: {
      tone: "plain",
    },
  },
);

interface LabelProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof labelVariants> {
  icon: React.ReactNode;
}

function Label({ icon, tone, className, children, ...props }: LabelProps) {
  return (
    <div data-slot="label" className={labelVariants({ tone, className })} {...props}>
      {icon}
      <p>{children}</p>
    </div>
  );
}

export { Label, labelVariants };
