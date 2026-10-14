import type { Bout } from "@/types/bout";
import type { Competitor } from "@/types/competitor";

export interface Board {
  bout: Bout;
  competitors: [Competitor, Competitor];
}
