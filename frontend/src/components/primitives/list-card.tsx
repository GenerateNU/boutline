import { cn } from "cn";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import PushPin from "@mui/icons-material/PushPin";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { PinButton } from "@/components/primitives/pin-button";

interface ListCardProps {
  title: string;
  description: React.ReactNode;
  badge?: React.ReactNode;
  href?: string;
  // Opens something in place, such as a dialog, instead of linking away; ignored with an href.
  onSelect?: () => void;
  pinned?: boolean;
  onTogglePin?: () => void;
}

const STRETCHED_TARGET_CLASS =
  "min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:rounded-[12px] focus-visible:after:ring-2 focus-visible:after:ring-ring";

function ListCard({ title, description, badge, href, onSelect, pinned, onTogglePin }: ListCardProps) {
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
      {/* The link or button stretches over the whole card, so all of it is the target
          while the pin button still sits on top as its own control. */}
      {href ? (
        <Link href={href} className={STRETCHED_TARGET_CLASS}>
          {header}
        </Link>
      ) : onSelect ? (
        <Button
          type="button"
          variant="text"
          onClick={onSelect}
          // Undoes Button's size, colour and own focus ring: like the link, this is the card's invisible target.
          className={cn(
            STRETCHED_TARGET_CLASS,
            "block h-auto shrink rounded-none p-0 whitespace-normal text-inherit hover:bg-transparent focus-visible:ring-0",
          )}
        >
          {header}
        </Button>
      ) : (
        <div className="min-w-0 flex-1">{header}</div>
      )}
      {badge}
      {pinned !== undefined && (
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
      {(href || onSelect) && (
        <ChevronRightOutlined aria-hidden className="size-6 shrink-0 text-neutral-muted" />
      )}
    </Card>
  );
}

export { ListCard };
