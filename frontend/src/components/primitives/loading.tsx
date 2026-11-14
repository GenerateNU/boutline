import { cn } from "cn";

import { CircularProgress } from "@/components/primitives/circular-progress";

function Loading({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="loading"
      role="status"
      className={cn("flex justify-center py-10", className)}
      {...props}
    >
      {/* A quarter arc spun in place; the ring itself is decorative, the status text is what's announced. */}
      <CircularProgress value={25} aria-hidden className="size-6 animate-spin" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export { Loading };
