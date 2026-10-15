import { RefreshCw } from "lucide-react";

import { Button } from "@/components/primitives/button";

interface OutOfSyncBannerProps {
  onRetry: () => void;
}

export function OutOfSyncBanner({ onRetry }: OutOfSyncBannerProps) {
  return (
    <div
      role="alert"
      aria-label="Out of sync"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive px-4 py-4 text-center"
    >
      <p className="text-base font-medium text-destructive">Out of sync with the server</p>
      <p className="text-sm text-muted-foreground">
        Scoring is paused until the bout reloads, so no touch is recorded against the wrong score.
      </p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="h-14 w-full touch-manipulation rounded-xl text-base"
      >
        <RefreshCw />
        Retry
      </Button>
    </div>
  );
}
