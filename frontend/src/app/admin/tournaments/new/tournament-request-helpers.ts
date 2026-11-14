import { FencerDraft, EventDraft, TournamentDraft } from "./_types/tournament-draft";
import { CompetitorRequest, EventRequest, TournamentRequest } from "./_types/tournament-requests";

// The form keeps display labels; these map each label to what the API accepts.
export const AUTHORITY_VALUES: Record<string, string> = {
  askFRED: "askfred",
  "USA Fencing": "usa_fencing",
  FIE: "fie",
  Other: "other",
};
export const EVENT_TYPE_VALUES: Record<string, string> = { Individual: "individual" };
export const WEAPON_VALUES: Record<string, string> = { Foil: "foil", Épée: "epee", Sabre: "sabre" };
export const GENDER_MIX_VALUES: Record<string, string> = { Male: "male", Female: "female", Other: "other" };
export const AGE_CATEGORY_VALUES: Record<string, string> = {
  Y8: "y8",
  Y10: "y10",
  Y12: "y12",
  Y14: "y14",
  Cadet: "cadet",
  Junior: "junior",
  Senior: "senior",
  Veteran: "veteran",
  Open: "open",
};
export const RATING_LEVEL_VALUES: Record<string, string> = {
  Open: "open",
  "B and under": "b_and_under",
  "C and under": "c_and_under",
  "D and under": "d_and_under",
  "E and under": "e_and_under",
  Unrated: "unrated",
};
export const QUALIFIER_VALUES: Record<string, boolean> = { No: false, Yes: true };

export const AUTHORITIES = Object.keys(AUTHORITY_VALUES);
export const WEAPONS = Object.keys(WEAPON_VALUES);
export const GENDER_MIXES = Object.keys(GENDER_MIX_VALUES);
export const AGE_CATEGORIES = Object.keys(AGE_CATEGORY_VALUES);
export const RATING_LEVELS = Object.keys(RATING_LEVEL_VALUES);
export const QUALIFIER_OPTIONS = Object.keys(QUALIFIER_VALUES);

// The date and time inputs are the admin's local wall clock; the API wants an instant.
export function localStartTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

export function tournamentRequest(draft: TournamentDraft): TournamentRequest {
  return {
    name: draft.name.trim(),
    city: draft.location.trim(),
    venue: draft.venue.trim(),
    start_time: localStartTime(draft.date, draft.time),
    sanctioning_authority: AUTHORITY_VALUES[draft.authority],
  };
}

export function eventRequest(event: EventDraft): EventRequest {
  return {
    name: event.name.trim(),
    start_time: localStartTime(event.date, event.time),
    type: EVENT_TYPE_VALUES[event.type],
    weapon: WEAPON_VALUES[event.weapon],
    gender: GENDER_MIX_VALUES[event.genderMix],
    age_category: AGE_CATEGORY_VALUES[event.ageCategory],
    rating_limit: RATING_LEVEL_VALUES[event.ratingLevel],
    qualifier: QUALIFIER_VALUES[event.qualifier],
  };
}

export function competitorRequest(fencer: FencerDraft): CompetitorRequest {
  return {
    firstName: fencer.firstName.trim(),
    lastName: fencer.lastName.trim(),
    gender: fencer.gender,
    birthdate: fencer.birthdate,
    division: fencer.division.trim(),
    rating: fencer.rating || "U",
    // The parser keeps four-digit years; the API takes the last two.
    ratingYear: fencer.ratingYear === undefined ? undefined : fencer.ratingYear % 100,
    primaryClub: fencer.club.trim(),
    memberNumber: fencer.memberNumber.trim(),
  };
}
