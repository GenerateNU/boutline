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
      className="fixed right-4 bottom-4 z-30 size-11.5 rounded-[12px] shadow-md [&_svg]:size-6"
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
