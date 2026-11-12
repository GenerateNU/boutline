import { cn } from "cn";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import PushPin from "@mui/icons-material/PushPin";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";

interface ListCardProps {
  title: React.ReactNode;
  description: React.ReactNode;
  badge?: React.ReactNode;
  href?: string;
  pinned?: boolean;
}

function ListCard({ href, ...props }: ListCardProps) {
  if (!href) {
    return <ListCardBody {...props} />;
  }

  return (
    <Link href={href} className="block rounded-[12px]">
      <ListCardBody {...props} linked />
    </Link>
  );
}

interface ListCardBodyProps extends Omit<ListCardProps, "href"> {
  linked?: boolean;
}

function ListCardBody({ title, description, badge, pinned, linked }: ListCardBodyProps) {
  // Material marks a pin as set with its filled glyph rather than by filling the outline.
  const PinIcon = pinned ? PushPin : PushPinOutlined;

  return (
    <Card
      orientation="horizontal"
      className={cn(
        "gap-2.5 py-3.5 pr-3 transition-colors hover:bg-blue-lightest",
        pinned && "border-blue-light bg-blue-lightest",
      )}
    >
      <CardHeader className="gap-0.5">
        <CardTitle className="text-sm text-obsidian uppercase">{title}</CardTitle>
        <CardDescription className="text-xs text-neutral-secondary">{description}</CardDescription>
      </CardHeader>
      {badge}
      {pinned !== undefined ? (
        <PinIcon
          aria-hidden
          className={cn("size-5 shrink-0", pinned ? "text-blue" : "text-neutral-muted")}
        />
      ) : (
        linked && <ChevronRightOutlined aria-hidden className="size-6 shrink-0 text-neutral-muted" />
      )}
    </Card>
  );
}

export { ListCard };
