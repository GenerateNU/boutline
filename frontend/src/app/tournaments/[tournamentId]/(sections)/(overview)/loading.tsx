import { Card } from "@/components/primitives/card";
import { Skeleton } from "@/components/primitives/skeleton";
import { Text } from "@/components/primitives/text";

const LABEL_WIDTHS = ["w-40", "w-52", "w-44"];
const SECTION_TITLES = ["Ongoing Events", "Upcoming Events", "Completed Events"];
const ROW_COUNT = 2;

// A route group, so this skeleton covers only the Overview. At the (sections) level it
// would also stand in for the other tabs until their own skeleton arrived.
export default function OverviewTabLoading() {
  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading tournament
      </span>

      <Card aria-hidden className="gap-2">
        <Skeleton className="h-7 w-3/4" />
        {LABEL_WIDTHS.map((width) => (
          <Skeleton key={width} className={`h-4 ${width}`} />
        ))}
      </Card>

      {SECTION_TITLES.map((title) => (
        <Card key={title} className="gap-1 rounded-lg px-1 py-3">
          <Text as="h2" variant="title" className="px-3.5">
            {title}
          </Text>
          <ul aria-hidden>
            {Array.from({ length: ROW_COUNT }, (_, row) => (
              <li
                key={row}
                className="flex items-center gap-3 border-b border-outline py-3 pr-2 pl-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-5 w-10 shrink-0 rounded-sm" />
                <Skeleton className="size-6 shrink-0 rounded-md" />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
