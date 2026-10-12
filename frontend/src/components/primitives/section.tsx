import { cn } from "cn";

type SectionProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

function Section({ title, children, className }: SectionProps) {
  return (
    <section className={cn(`flex flex-col gap-4`, className)}>
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export { Section };
