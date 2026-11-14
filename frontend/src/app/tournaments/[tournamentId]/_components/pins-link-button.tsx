"use client";

import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PinButton } from "@/components/primitives/pin-button";

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
    <PinButton
      asChild
      variant="primary"
      size="sm"
      className="fixed right-4 bottom-4 z-30 lg:right-8 lg:bottom-8 lg:h-14 lg:w-auto lg:gap-2 lg:px-6 lg:text-base lg:font-semibold"
    >
      <Link href={`/pinned?tournamentId=${encodeURIComponent(tournamentId)}`}>
        <PushPinOutlined aria-hidden />
        {/* Visible on laptops; on phones it stays the link's name for screen readers. */}
        <span className="sr-only lg:not-sr-only">Pinned</span>
      </Link>
    </PinButton>
  );
}

export { PinsLinkButton };
