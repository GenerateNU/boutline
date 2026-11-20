import { apiRequest } from "@/services/api-request";
import type { Competitor } from "@/types/competitor";

export function setCheckedIn(id: string, checkedIn: boolean) {
  return apiRequest<Competitor>(`/competitors/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ checkedIn }),
  });
}
