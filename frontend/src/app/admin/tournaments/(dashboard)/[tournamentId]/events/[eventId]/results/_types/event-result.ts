export interface EventResult {
  place: number;
  competitor_id: string;
  first_name: string;
  last_name: string;
  club: string | null;
  rating: string;
  rating_year?: number | null;
  decided_by: "pool" | "direct_elimination";
}
