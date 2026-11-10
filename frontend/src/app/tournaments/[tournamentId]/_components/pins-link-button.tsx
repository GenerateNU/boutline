"use client";

import { Pin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/primitives/button";

interface PinsLinkButtonProps {
  tournamentId: string;
}

function PinsLinkButton({ tournamentId }: PinsLinkButtonProps) {
  const pathname = usePathname();

  // The referee screen has large touch targets at the bottom that this would cover.
  if (pathname.endsWith("/referee")) {
    return null;
  }

  return (
    <Button
      asChild
      size="icon"
      className="fixed right-4 bottom-4 z-30 shadow-md"
    >
      <Link
        href={`/pinned?tournamentId=${encodeURIComponent(tournamentId)}`}
        aria-label="View pins"
      >
        <Pin aria-hidden />
      </Link>
    </Button>
  );
}

export { PinsLinkButton };
