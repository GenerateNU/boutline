"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { useToast } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";
import type { PoolStage } from "@/types/pool-stage";
import { errorMessage } from "@/utils/error-message";

interface EndPoolStageButtonProps {
  poolStageId: string;
}

function EndPoolStageButton({ poolStageId }: EndPoolStageButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await apiRequest<PoolStage>(`/pool-stages/${encodeURIComponent(poolStageId)}/end`, {
          method: "POST",
        });
        toast({ description: "Pool stage ended" });
        router.refresh();
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      End pool stage
    </Button>
  );
}

export { EndPoolStageButton };
