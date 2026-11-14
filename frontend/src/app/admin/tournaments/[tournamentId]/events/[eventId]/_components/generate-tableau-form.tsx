"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { TextField } from "@/components/primitives/text-field";
import { useToast } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

interface GenerateTableauFormProps {
  directEliminationId: string;
}

function GenerateTableauForm({ directEliminationId }: GenerateTableauFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const advancePercent = Number(new FormData(event.currentTarget).get("advance_percent"));

    startTransition(async () => {
      try {
        await apiRequest(`/direct-eliminations/${encodeURIComponent(directEliminationId)}/generate`, {
          method: "POST",
          body: JSON.stringify({ advance_percent: advancePercent }),
        });
        toast({ description: "Tableau drawn" });
        router.refresh();
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label="Advance %"
        name="advance_percent"
        type="number"
        defaultValue={100}
        min={1}
        max={100}
        required
      />
      <Button type="submit" disabled={pending}>
        Generate tableau
      </Button>
    </form>
  );
}

export { GenerateTableauForm };
