import { joinStartTime, splitStartTime } from "@/features/event/lib/start-time-fields";
import type { EventUpdate } from "@/features/event/services/updateEvent";
import type {
  EventAgeCategory,
  EventGender,
  EventRatingLimit,
  EventType,
  EventWeapon,
  TournamentEvent,
} from "@/features/event/types/event";

// Select values are strings, so an unset attribute is "" rather than null.
export interface EventSettingsValues {
  type: EventType | "";
  date: Date | undefined;
  time: string;
  weapon: EventWeapon | "";
  gender: EventGender | "";
  ageCategory: EventAgeCategory | "";
  ratingLimit: EventRatingLimit | "";
}

export function valuesFrom(event: TournamentEvent): EventSettingsValues {
  return {
    type: event.type ?? "",
    ...splitStartTime(event.start_time),
    weapon: event.weapon ?? "",
    gender: event.gender ?? "",
    ageCategory: event.age_category ?? "",
    ratingLimit: event.rating_limit ?? "",
  };
}

// Unset fields become undefined, which JSON drops, so the API leaves them as they are. A setting
// picked back to None goes in `clear` instead, so the API empties it.
export function updateFrom(values: EventSettingsValues, event: TournamentEvent): EventUpdate {
  const clear: NonNullable<EventUpdate["clear"]> = [];
  if (!values.type && event.type) {
    clear.push("type");
  }
  if (!values.ageCategory && event.age_category) {
    clear.push("age_category");
  }
  return {
    start_time: values.date && values.time ? joinStartTime(values.date, values.time) : undefined,
    type: values.type || undefined,
    weapon: values.weapon || undefined,
    gender: values.gender || undefined,
    age_category: values.ageCategory || undefined,
    rating_limit: values.ratingLimit || undefined,
    clear: clear.length > 0 ? clear : undefined,
  };
}
