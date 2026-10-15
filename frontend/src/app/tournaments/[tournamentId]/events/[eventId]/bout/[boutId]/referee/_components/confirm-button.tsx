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
      className="h-14 w-full touch-manipulation rounded-xl text-base"
    >
      {confirmed && <Check />}
      {confirmed ? `${name} confirmed` : `Confirm ${name}`}
    </Button>
  );
}
