"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { useToast } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";
import { DirectElimination } from "@/types/direct-elimination";
import { errorMessage } from "@/utils/error-message";

interface CreateDirectEliminationButtonProps {
  eventId: string;
}

function CreateDirectEliminationButton({ eventId }: CreateDirectEliminationButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await apiRequest<DirectElimination>("/direct-eliminations", {
          method: "POST",
          body: JSON.stringify({ event_id: eventId }),
        });
        toast({ description: "Direct elimination created" });
        router.refresh();
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      Create direct elimination
    </Button>
  );
}

export { CreateDirectEliminationButton };
