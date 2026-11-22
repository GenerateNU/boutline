import { usePathname } from "next/navigation";

// Read off the URL rather than the layout segment, so the loading screen above the event
// layout gets the same answer. Indexed rather than sliced by the ids, since the pathname is
// percent-encoded and params aren't.
export function useEventTab(): string | undefined {
  return usePathname().split("/")[5];
}
