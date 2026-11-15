import { Text } from "@/components/primitives/text";
import { FencerBrowserSkeleton } from "@/features/competitor/components/fencer-browser-skeleton";

// The route group keeps this skeleton off a fencer's own page.
export default function EventFencersTabLoading() {
  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading fencers
      </span>
      <Text as="h1" variant="title">
        Fencers
      </Text>
      <FencerBrowserSkeleton />
    </div>
  );
}
