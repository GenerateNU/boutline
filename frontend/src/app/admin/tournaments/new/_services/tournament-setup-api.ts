import { ApiRequestError, apiRequest } from "@/services/api-request";

import {
  CompetitorRequest,
  CreatedResource,
  CreateCompetitorRequest,
  CreateEventRequest,
  EventRequest,
  TournamentRequest,
} from "../_types/tournament-requests";

function send<T>(path: string, method: string, body: unknown) {
  return apiRequest<T>(path, { method, body: JSON.stringify(body) });
}

// 404 means the resource is already gone, which is what the delete wanted.
async function remove(path: string) {
  try {
    await apiRequest<void>(path, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiRequestError && error.status === 404)) {
      throw error;
    }
  }
}

export function createTournament(body: TournamentRequest) {
  return send<CreatedResource>("/tournaments", "POST", body);
}

export function updateTournament(id: string, body: TournamentRequest) {
  return send<CreatedResource>(`/tournaments/${id}`, "PATCH", body);
}

export function createEvent(body: CreateEventRequest) {
  return send<CreatedResource>("/events", "POST", body);
}

export function updateEvent(id: string, body: EventRequest) {
  return send<CreatedResource>(`/events/${id}`, "PATCH", body);
}

export function deleteEvent(id: string) {
  return remove(`/events/${id}`);
}

export function createCompetitor(body: CreateCompetitorRequest) {
  return send<CreatedResource>("/competitors", "POST", body);
}

export function updateCompetitor(id: string, body: CompetitorRequest) {
  return send<CreatedResource>(`/competitors/${id}`, "PATCH", body);
}

export function deleteCompetitor(id: string) {
  return remove(`/competitors/${id}`);
}
