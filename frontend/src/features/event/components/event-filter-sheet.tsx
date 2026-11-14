"use client";

import { useState } from "react";

import { ChipGroup, ChipGroupOptions } from "@/components/primitives/chip-group";
import { ComingSoonNote } from "@/components/primitives/coming-soon-note";
import { DateField } from "@/components/primitives/date-field";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { SelectField } from "@/components/primitives/select-field";
import {
  AGE_LABELS,
  GENDER_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  WEAPON_LABELS,
} from "@/features/event/lib/event-filters";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";

const FILTER_PARAMS = ["weapon", "age", "gender", "status", "type"];
const NO_VALUES = Object.fromEntries(FILTER_PARAMS.map((param) => [param, ""]));

function toOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

const WEAPON_OPTIONS = toOptions(WEAPON_LABELS);
const AGE_OPTIONS = toOptions(AGE_LABELS);
const GENDER_OPTIONS = toOptions(GENDER_LABELS);
const STATUS_OPTIONS = toOptions(STATUS_LABELS);
const TYPE_OPTIONS = toOptions(TYPE_LABELS);

interface EventFilterSheetProps {
  // "YYYY-MM-DD" days with events, marked in the date picker.
  eventDays: string[];
}

function EventFilterSheet({ eventDays }: EventFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(NO_VALUES);
  const [date, setDate] = useState<Date>();

  function load() {
    setValues(Object.fromEntries(FILTER_PARAMS.map((param) => [param, searchParams.get(param) ?? ""])));
    setDate(parseDateParam(searchParams.get("date")));
  }

  function groupProps(param: string) {
    return {
      value: values[param],
      onValueChange: (value: string) => setValues({ ...values, [param]: value }),
    };
  }

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          load();
        }
        setOpen(next);
      }}
      triggerLabel="Filter events"
      description="Narrow the event list"
      submitLabel="Show Events"
      onReset={() => {
        setValues(NO_VALUES);
        setDate(undefined);
      }}
      onSubmit={() => {
        setFilters({ ...values, date: date && formatDateParam(date) });
        setOpen(false);
      }}
    >
      <ComingSoonNote />

      {["Fencer", "Club"].map((label) => (
        <FilterSearchField
          key={label}
          label={label}
          disabled
          suggestions={null}
          failed={false}
          selected=""
          onPick={() => {}}
          noun={`${label.toLowerCase()}s`}
        />
      ))}

      <ChipGroup label="Weapon" {...groupProps("weapon")}>
        <ChipGroupOptions options={WEAPON_OPTIONS} />
      </ChipGroup>

      <SelectField
        label="Age Category"
        placeholder="Any age category"
        options={AGE_OPTIONS}
        {...groupProps("age")}
      />

      <ChipGroup label="Gender" {...groupProps("gender")}>
        <ChipGroupOptions options={GENDER_OPTIONS} />
      </ChipGroup>
      <ChipGroup label="Event Status" {...groupProps("status")}>
        <ChipGroupOptions options={STATUS_OPTIONS} />
      </ChipGroup>

      <DateField
        key={date?.getTime()}
        label="Date"
        defaultValue={date}
        onValueChange={setDate}
        eventDates={eventDays.flatMap((day) => parseDateParam(day) ?? [])}
      />

      <ChipGroup label="Event Type" {...groupProps("type")}>
        <ChipGroupOptions options={TYPE_OPTIONS} />
      </ChipGroup>
    </FilterSheetDialog>
  );
}

export { EventFilterSheet };
