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
    <PinButton asChild variant="primary" size="sm" className="fixed right-4 bottom-4 z-30">
      <Link
        href={`/pinned?tournamentId=${encodeURIComponent(tournamentId)}`}
        aria-label="View pins"
      >
        <PushPinOutlined aria-hidden />
      </Link>
    </PinButton>
  );
}

export { PinsLinkButton };
