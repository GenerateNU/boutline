import { cn } from "cn";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import PushPin from "@mui/icons-material/PushPin";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { PinButton } from "@/components/primitives/pin-button";

interface ListCardProps {
  title: string;
  description: React.ReactNode;
  badge?: React.ReactNode;
  href?: string;
  pinned?: boolean;
  // Turns the pin into a button; without it the pin only shows the state.
  onTogglePin?: () => void;
}

function ListCard({ title, description, badge, href, pinned, onTogglePin }: ListCardProps) {
  // Material marks a pin as set with its filled glyph rather than by filling the outline.
  const PinIcon = pinned ? PushPin : PushPinOutlined;

  const header = (
    <CardHeader className="gap-0.5">
      <CardTitle className="text-sm text-obsidian uppercase">{title}</CardTitle>
      <CardDescription className="text-xs text-neutral-secondary">{description}</CardDescription>
    </CardHeader>
  );

  return (
    <Card
      orientation="horizontal"
      className={cn("relative gap-2.5 py-3.5 pr-3 transition-colors hover:bg-blue-lightest", {
        "border-blue-light bg-blue-lightest": pinned,
      })}
    >
      {href ? (
        // The link stretches over the whole card, so all of it opens the page
        // while the pin button still sits on top as its own control.
        <Link
          href={href}
          className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:rounded-[12px] focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {header}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{header}</div>
      )}
      {badge}
      {pinned !== undefined && onTogglePin && (
        <PinButton
          variant="plain"
          size="xs"
          active={pinned}
          aria-label={`${pinned ? "Unpin" : "Pin"} ${title}`}
          onClick={onTogglePin}
          className="relative z-10 [&_svg]:size-5"
        >
          <PinIcon aria-hidden />
        </PinButton>
      )}
      {pinned !== undefined && !onTogglePin && (
        <PinIcon
          aria-hidden
          className={cn("size-5 shrink-0", pinned ? "text-blue" : "text-neutral-muted")}
        />
      )}
      {pinned === undefined && href && (
        <ChevronRightOutlined aria-hidden className="size-6 shrink-0 text-neutral-muted" />
      )}
    </Card>
  );
}

export { ListCard };
