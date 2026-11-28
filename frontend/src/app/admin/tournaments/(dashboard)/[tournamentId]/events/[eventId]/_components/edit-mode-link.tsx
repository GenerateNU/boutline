import Link from "next/link";

import { Button } from "@/components/primitives/button";

interface EditModeLinkProps {
  editing: boolean;
  path: string;
  variant?: "filled" | "outline";
  className?: string;
}

export function EditModeLink({ editing, path, variant, className }: EditModeLinkProps) {
  return (
    <Button asChild size="sm" variant={variant} className={className}>
      <Link href={editing ? path : `${path}?edit=1`}>
        {editing ? "Exit Edit Mode" : "Edit Mode"}
      </Link>
    </Button>
  );
}
