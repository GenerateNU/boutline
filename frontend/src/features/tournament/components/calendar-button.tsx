"use client";

import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Calendar } from "@/components/primitives/calendar";
import { Modal } from "@/components/primitives/modal";
import { useToday } from "@/features/tournament/hooks/use-today";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { parseDateParam } from "@/features/tournament/lib/date-param";

interface CalendarButtonProps {
  // The pop-up's confirm button; unused when inline.
  submitLabel?: string;
  // The day shown while the URL has no date, when the page picks one itself.
  defaultDay?: string;
  // "YYYY-MM-DD" days to mark with a dot.
  eventDays?: string[];
  // Opens as a card below its row instead of a pop-up, and a tap picks the day
  // straight away. The parent row must be `flex-wrap` so the card takes a line.
  inline?: boolean;
}

function CalendarButton({
  submitLabel = "Show",
  defaultDay,
  eventDays = [],
  inline = false,
}: CalendarButtonProps) {
  const { searchParams, setDate } = useTournamentFilters();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>();
  const [month, setMonth] = useState<Date>();

  function openCalendar() {
    const selected = parseDateParam(searchParams.get("date")) ?? parseDateParam(defaultDay) ?? today;
    setDraft(selected);
    setMonth(selected);
    setOpen(true);
  }

  const modifiers = { hasEvent: eventDays.flatMap((day) => parseDateParam(day) ?? []) };
  const toggle = (
    <Button
      type="button"
      variant="text"
      size="icon"
      aria-label="Calendar"
      aria-expanded={inline ? open : undefined}
      onClick={open && inline ? () => setOpen(false) : openCalendar}
      className="-m-2 text-obsidian [&_svg]:size-6"
    >
      <CalendarTodayOutlined />
    </Button>
  );

  if (inline) {
    return (
      <>
        {toggle}
        {open && (
          <div className="basis-full rounded-xl border border-outline bg-background p-3 shadow-md">
            <Calendar
              mode="single"
              required
              today={today}
              modifiers={modifiers}
              month={month}
              onMonthChange={setMonth}
              selected={draft}
              onSelect={(day) => {
                setDate(day);
                setOpen(false);
              }}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {toggle}
      <Modal open={open} onOpenChange={setOpen} title="Calendar">
        <Calendar
          mode="single"
          required
          today={today}
          modifiers={modifiers}
          month={month}
          onMonthChange={setMonth}
          selected={draft}
          onSelect={setDraft}
        />
        <Button
          type="button"
          className="w-full rounded-lg"
          onClick={() => {
            if (draft) {
              setDate(draft);
            }
            setOpen(false);
          }}
        >
          {submitLabel}
        </Button>
      </Modal>
    </>
  );
}

export { CalendarButton };
