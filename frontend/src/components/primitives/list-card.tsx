import { cn } from "cn";
import { ChevronRight, Pin } from "lucide-react";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";

interface ListCardProps {
  title: React.ReactNode;
  description: React.ReactNode;
  badge?: React.ReactNode;
  href?: string;
  pinned?: boolean;
}

function ListCard({ title, description, badge, href, pinned }: ListCardProps) {
  const card = (
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
        <Pin
          aria-hidden
          className={cn("size-5 shrink-0", pinned ? "fill-blue text-blue" : "text-neutral-muted")}
        />
      ) : (
        href && <ChevronRight aria-hidden className="size-6 shrink-0 text-neutral-muted" />
      )}
    </Card>
  );

  return href ? (
    <Link href={href} className="block rounded-[12px]">
      {card}
    </Link>
  ) : (
    card
  );
}

export { ListCard };
