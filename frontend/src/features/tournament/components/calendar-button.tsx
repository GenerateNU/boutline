"use client";

import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Calendar } from "@/components/primitives/calendar";
import { Modal } from "@/components/primitives/modal";
import { useToday } from "@/features/tournament/hooks/use-today";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { parseDateParam } from "@/features/tournament/lib/date-param";

function CalendarButton() {
  const { searchParams, setDate } = useTournamentFilters();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>();
  const [month, setMonth] = useState<Date>();

  function openCalendar() {
    const selected = parseDateParam(searchParams.get("date"));
    setDraft(selected);
    setMonth(selected ?? today);
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Calendar"
        onClick={openCalendar}
        className="-m-2 text-obsidian [&_svg]:size-6"
      >
        <CalendarTodayOutlined />
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Calendar">
        <Calendar
          mode="single"
          today={today}
          month={month}
          onMonthChange={setMonth}
          selected={draft}
          onSelect={setDraft}
        />
        <Button
          type="button"
          className="w-full rounded-lg"
          onClick={() => {
            setDate(draft);
            setOpen(false);
          }}
        >
          Show Tournaments
        </Button>
      </Modal>
    </>
  );
}

export { CalendarButton };
