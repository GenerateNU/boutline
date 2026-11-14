import { EventDraft } from "./_types/tournament-draft";
import { newEventDraft, newFencerDraft } from "./tournament-draft-helpers";
import {
  AGE_CATEGORIES,
  AGE_CATEGORY_VALUES,
  AUTHORITIES,
  AUTHORITY_VALUES,
  competitorRequest,
  eventRequest,
  GENDER_MIXES,
  localStartTime,
  QUALIFIER_OPTIONS,
  RATING_LEVELS,
  RATING_LEVEL_VALUES,
  tournamentRequest,
  WEAPON_VALUES,
  WEAPONS,
} from "./tournament-request-helpers";

describe("option lists", () => {
  it.each([
    { name: "authorities", options: AUTHORITIES, want: ["askFRED", "USA Fencing", "FIE", "Other"] },
    { name: "weapons", options: WEAPONS, want: ["Foil", "Épée", "Sabre"] },
    { name: "gender mixes", options: GENDER_MIXES, want: ["Men", "Women", "Mixed"] },
    { name: "age categories", options: AGE_CATEGORIES, want: ["Y8", "Y10", "Y12", "Y14", "Cadet", "Junior", "Senior", "Veteran", "Open"] },
    {
      name: "rating levels",
      options: RATING_LEVELS,
      want: ["Open", "B and under", "C and under", "D and under", "E and under", "Unrated"],
    },
    { name: "qualifier", options: QUALIFIER_OPTIONS, want: ["No", "Yes"] },
  ])("keeps the form's $name labels in order", ({ options, want }) => {
    expect(options).toEqual(want);
  });
});

describe("localStartTime", () => {
  it("reads the date and time as local wall clock", () => {
    expect(localStartTime("2026-11-20", "09:30")).toBe(new Date(2026, 10, 20, 9, 30).toISOString());
  });
});

describe("tournamentRequest", () => {
  it.each(Object.entries(AUTHORITY_VALUES))("sends authority %s as %s", (authority, wire) => {
    const draft = {
      name: " Open ",
      location: " Boston, MA ",
      venue: "Cabot",
      date: "2026-11-20",
      time: "09:00",
      authority,
      saved: false,
      events: [],
    };

    expect(tournamentRequest(draft)).toEqual({
      name: "Open",
      city: "Boston, MA",
      venue: "Cabot",
      start_time: localStartTime("2026-11-20", "09:00"),
      sanctioning_authority: wire,
    });
  });
});

describe("eventRequest", () => {
  const FILLED: EventDraft = {
    ...newEventDraft(" Y14 Foil "),
    date: "2026-11-20",
    time: "10:00",
    weapon: "Foil",
    genderMix: "Women",
    ageCategory: "Y14",
    ratingLevel: "Open",
    qualifier: "No",
  };

  it("maps every label and leaves the format out", () => {
    expect(eventRequest(FILLED)).toEqual({
      name: "Y14 Foil",
      start_time: localStartTime("2026-11-20", "10:00"),
      type: "individual",
      weapon: "foil",
      gender: "women",
      age_category: "y14",
      rating_limit: "open",
      qualifier: false,
    });
  });

  it.each([
    ...Object.entries(WEAPON_VALUES).map(([label, wire]) => ({ patch: { weapon: label }, key: "weapon", wire })),
    ...Object.entries(AGE_CATEGORY_VALUES).map(([label, wire]) => ({ patch: { ageCategory: label }, key: "age_category", wire })),
    ...Object.entries(RATING_LEVEL_VALUES).map(([label, wire]) => ({ patch: { ratingLevel: label }, key: "rating_limit", wire })),
    { patch: { qualifier: "Yes" }, key: "qualifier", wire: true },
  ])("sends $patch as $key=$wire", ({ patch, key, wire }) => {
    expect(eventRequest({ ...FILLED, ...patch })).toMatchObject({ [key]: wire });
  });
});

describe("competitorRequest", () => {
  const FENCER = {
    ...newFencerDraft(),
    firstName: " Ada ",
    lastName: "Lovelace",
    gender: "F",
    birthdate: "2011-03-14",
    division: "New England",
    club: " Salle ",
    memberNumber: "100200",
    country: "USA",
  };

  it.each([
    {
      name: "renames club, trims, and drops country",
      patch: { rating: "C" as const, ratingYear: 2024 },
      want: { rating: "C", ratingYear: 24, primaryClub: "Salle" },
    },
    {
      name: "sends a blank rating as unrated with no year",
      patch: { rating: "" as const, ratingYear: undefined },
      want: { rating: "U", ratingYear: undefined, primaryClub: "Salle" },
    },
    {
      name: "sends a blank club as an empty string",
      patch: { rating: "U" as const, club: "  " },
      want: { rating: "U", primaryClub: "" },
    },
  ])("$name", ({ patch, want }) => {
    const request = competitorRequest({ ...FENCER, ...patch });

    expect(request).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      gender: "F",
      birthdate: "2011-03-14",
      division: "New England",
      memberNumber: "100200",
      ...want,
    });
    expect(request).not.toHaveProperty("country");
  });
});
