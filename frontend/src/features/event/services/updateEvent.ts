import type {
  EventAgeCategory,
  EventGender,
  EventRatingLimit,
  EventType,
  EventWeapon,
  TournamentEvent,
} from "@/features/event/types/event";
import { apiRequest } from "@/services/api-request";

// An omitted field is left as it is; one named in `clear` is set back to empty.
export interface EventUpdate {
  start_time?: string;
  type?: EventType;
  weapon?: EventWeapon;
  gender?: EventGender;
  age_category?: EventAgeCategory;
  rating_limit?: EventRatingLimit;
  clear?: ("type" | "age_category")[];
}

export function updateEvent(id: string, body: EventUpdate) {
  return apiRequest<TournamentEvent>(`/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
