export type EventStatus = "upcoming" | "active" | "ended";

export type Event = {
  id: string;
  tournament_id: string;
  format: string;
  name: string;
  status: EventStatus;
  start_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventListResult = {
  data: Event[];
  total: number;
  limit: number;
  offset: number;
};
