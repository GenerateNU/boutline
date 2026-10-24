import { Bout } from "@/types/bout";
import { Competitor } from "@/types/competitor";

export interface Matchup {
  bout: Bout;
  competitors: [Competitor, Competitor];
}
