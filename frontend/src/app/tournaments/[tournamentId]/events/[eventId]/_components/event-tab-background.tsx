import { Background } from "@/components/primitives/background";

// The tab's pattern, lightened by a half-white layer painted just above it.
function EventTabBackground() {
  return (
    <>
      <Background version={7} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-background/50"
      />
    </>
  );
}

export { EventTabBackground };
