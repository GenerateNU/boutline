import { cva, type VariantProps } from "class-variance-authority";

const textVariants = cva("", {
  variants: {
    variant: {
      title: "text-xl font-semibold text-obsidian",
      subtitle: "text-sm font-semibold text-obsidian",
      body: "text-sm text-obsidian",
      caption: "text-xs font-medium text-neutral-secondary",
      muted: "text-sm text-neutral-secondary",
    },
  },
  defaultVariants: {
    variant: "body",
  },
});

interface TextProps extends React.ComponentProps<"p">, VariantProps<typeof textVariants> {
  as?: "p" | "h1" | "h2" | "h3";
}

function Text({ as: Tag = "p", variant, className, ...props }: TextProps) {
  return <Tag data-slot="text" className={textVariants({ variant, className })} {...props} />;
}

export { Text, textVariants };
