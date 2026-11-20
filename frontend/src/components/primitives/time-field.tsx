import { format, parse } from "date-fns";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";

import { SelectField } from "@/components/primitives/select-field";

const SLOT_MINUTES = 15;
const SLOTS = Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, slot) => {
  const minutes = slot * SLOT_MINUTES;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

interface TimeFieldProps extends Omit<React.ComponentProps<typeof SelectField>, "options" | "icon"> {
  // "HH:mm", the same shape as a native time input's value.
  value: string;
  onValueChange: (time: string) => void;
}

function TimeField({ value, placeholder = "Select time", ...props }: TimeFieldProps) {
  // A time off the 15-minute grid (typed into an older draft) stays pickable instead of showing blank.
  const times = value && !SLOTS.includes(value) ? [...SLOTS, value].sort() : SLOTS;

  return (
    <SelectField
      {...props}
      value={value}
      placeholder={placeholder}
      icon={<ScheduleOutlined aria-hidden className="size-4 shrink-0 text-neutral-secondary" />}
      options={times.map((time) => ({ value: time, label: format(parse(time, "HH:mm", new Date()), "h:mm a") }))}
    />
  );
}

export { TimeField };
