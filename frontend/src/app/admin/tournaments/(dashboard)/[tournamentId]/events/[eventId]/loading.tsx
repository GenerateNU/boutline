import { Section } from "@/components/primitives/section";
import { Skeleton } from "@/components/primitives/skeleton";

export default function AdminEventLoading() {
  return (
    <div className="flex flex-col gap-10">
      <span role="status" className="sr-only">
        Loading event
      </span>
      <Skeleton className="h-5 w-40 self-start" />
      <Section title="Pool stage">
        <Skeleton className="h-6 w-24 self-start rounded-full" />
      </Section>
    </div>
  );
}
