"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { useToast } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";
import type { DirectElimination } from "@/types/direct-elimination";
import { errorMessage } from "@/utils/error-message";

interface StartDirectEliminationButtonProps {
  directEliminationId: string;
}

function StartDirectEliminationButton({ directEliminationId }: StartDirectEliminationButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await apiRequest<DirectElimination>(
          `/direct-eliminations/${encodeURIComponent(directEliminationId)}/start`,
          { method: "POST" },
        );
        toast({ description: "Direct elimination started" });
        router.refresh();
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      Start direct elimination
    </Button>
  );
}

export { StartDirectEliminationButton };
