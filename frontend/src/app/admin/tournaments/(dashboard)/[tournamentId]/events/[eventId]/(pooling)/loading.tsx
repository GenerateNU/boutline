import { Section } from "@/components/primitives/section";
import { Skeleton } from "@/components/primitives/skeleton";

const POOL_CARD_SKELETONS = 2;

export default function PoolingLoading() {
  return (
    <div className="flex flex-col gap-10">
      <p role="status" className="sr-only">
        Loading pools
      </p>
      <div aria-hidden className="flex flex-col gap-4">
        {Array.from({ length: POOL_CARD_SKELETONS }, (_, index) => (
          <Skeleton key={index} className="h-40 rounded-[12px]" />
        ))}
      </div>
      <Section title="Pool stage">
        <Skeleton className="h-6 w-24 self-start rounded-full" />
      </Section>
    </div>
  );
}
