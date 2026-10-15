import { Check } from "lucide-react";

import { Button } from "@/components/primitives/button";

interface ConfirmButtonProps {
  name: string;
  confirmed: boolean;
  onConfirm: () => void;
}

export function ConfirmButton({ name, confirmed, onConfirm }: ConfirmButtonProps) {
  return (
    <Button
      disabled={confirmed}
      onClick={onConfirm}
      className="h-auto min-h-14 w-full min-w-0 touch-manipulation rounded-xl py-3 text-base break-words whitespace-normal"
    >
      {confirmed && <Check />}
      {confirmed ? `${name} confirmed` : `Confirm ${name}`}
    </Button>
  );
}
