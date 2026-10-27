import { cn } from "cn";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link, { type LinkProps } from "next/link";

import { Button } from "@/components/primitives/button";
import { dayWindow, formatDayLabel } from "@/lib/event-schedule";

const VISIBLE_DAYS = 3;

interface EventDateStripProps {
  basePath: string;
  days: string[];
  selected: string;
  search: string;
}

interface StepProps {
  href: LinkProps["href"] | null;
  rel: "prev" | "next";
  label: string;
  children: React.ReactNode;
}

function Step({ href, rel, label, children }: StepProps) {
  return (
    <Button
      asChild={href !== null}
      variant="outline"
      size="icon"
      disabled={href === null}
      aria-label={href === null ? label : undefined}
    >
      {href === null ? (
        children
      ) : (
        <Link href={href} rel={rel} aria-label={label}>
          {children}
        </Link>
      )}
    </Button>
  );
}

function EventDateStrip({
  basePath,
  days,
  selected,
  search,
}: EventDateStripProps) {
  // Link builds and encodes the query string from this object.
  function dayLinkWithSearch(day: string): LinkProps["href"] {
    return {
      pathname: basePath,
      query: search ? { date: day, q: search } : { date: day },
    };
  }

  const index = days.indexOf(selected);
  const previous = days[index - 1];
  const next = days[index + 1];

  return (
    <nav aria-label="Event days" className="flex items-center gap-2">
      <Step
        href={previous ? dayLinkWithSearch(previous) : null}
        rel="prev"
        label="Previous day"
      >
        <ChevronLeft aria-hidden />
      </Step>

      <ul className="flex flex-1 border-b border-border">
        {dayWindow(days, selected, VISIBLE_DAYS).map((day) => (
          <li key={day} className="flex flex-1">
            <Link
              href={dayLinkWithSearch(day)}
              aria-current={day === selected ? "date" : undefined}
              className={cn(
                "relative flex flex-1 cursor-pointer items-center justify-center gap-3 px-4 py-3 text-sm whitespace-nowrap outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground after:opacity-0 aria-[current=date]:after:opacity-100",
              )}
            >
              {formatDayLabel(day)}
            </Link>
          </li>
        ))}
      </ul>

      <Step href={next ? dayLinkWithSearch(next) : null} rel="next" label="Next day">
        <ChevronRight aria-hidden />
      </Step>

      {/* Inert on purpose: the calendar view is a follow-up ticket. */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Calendar view (not available yet)"
        className="shrink-0 rounded-md"
      >
        <CalendarDays aria-hidden />
      </Button>
    </nav>
  );
}

export { EventDateStrip };
