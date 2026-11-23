import { ListCardSkeleton } from "@/components/primitives/list-card-skeleton";
import { Skeleton } from "@/components/primitives/skeleton";
import { cn } from "cn";

const TABS = ["All", "Fencers", "Clubs", "Pools", "Tableaus"];
const SELECTED_TAB = "All";
const FENCER_CARD_COUNT = 3;
const EMPTY_SECTION_TITLES = ["Clubs", "Pools", "Tableaus"];

interface SectionHeadingProps {
  title: string;
}

function SectionHeading({ title }: SectionHeadingProps) {
  return <h2 className="text-base font-medium text-obsidian">{title}</h2>;
}

// Tab row copied from TabsTrigger's markup but inert: switching tabs before the pins load would do nothing.
function PinnedItemsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <span role="status" className="sr-only">
        Loading pins
      </span>
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <div
            key={tab}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-3 px-4 py-3 text-sm whitespace-nowrap",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground after:opacity-0",
              tab === SELECTED_TAB && "after:opacity-100",
            )}
          >
            {tab}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6 pt-4">
        <section className="flex flex-col gap-3">
          <SectionHeading title="Fencers" />
          <ul aria-hidden className="flex flex-col gap-2">
            {Array.from({ length: FENCER_CARD_COUNT }, (_, index) => (
              <li key={index}>
                <ListCardSkeleton badge />
              </li>
            ))}
          </ul>
        </section>
        {EMPTY_SECTION_TITLES.map((title) => (
          <section key={title} className="flex flex-col gap-3">
            <SectionHeading title={title} />
            <Skeleton className="h-4 w-40" />
          </section>
        ))}
      </div>
    </div>
  );
}

export { PinnedItemsSkeleton };
