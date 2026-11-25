import { Section } from "@/components/primitives/section";
import { Skeleton } from "@/components/primitives/skeleton";

export default function PoolsTabLoading() {
  return (
    <div className="flex flex-col gap-10">
      <span role="status" className="sr-only">
        Loading pools
      </span>
      <Section title="Pool stage">
        <Skeleton className="h-6 w-24 self-start rounded-full" />
      </Section>
    </div>
  );
}
