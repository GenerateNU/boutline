import { CompetitorImportRow, CompetitorImportStatus } from "@/types/competitor-import";

import {
  eventTitle,
  formatRating,
  importFencers,
  missingEventFields,
  missingFencerFields,
  newEventDraft,
  newFencerDraft,
} from "./tournament-draft-helpers";

function row(firstName: string, event: string, status: CompetitorImportStatus = "valid"): CompetitorImportRow {
  return {
    line: 2,
    status,
    errors: [],
    competitor: {
      firstName,
      lastName: "Fencer",
      memberNumber: "",
      club: "",
      division: "",
      country: "",
      birthdate: "",
      gender: "",
      rating: "U",
      event,
    },
  };
}

// Each card as "name: first names", which is all importFencers changes.
function summarize(events: ReturnType<typeof importFencers>) {
  return events.map((event) => `${event.name}: ${event.fencers.map((fencer) => fencer.firstName).join(" ")}`);
}

describe("importFencers", () => {
  it.each([
    {
      name: "fills the blank first card when the file has no Event column",
      events: [""],
      rows: [row("Ada", ""), row("Bea", "")],
      want: [": Ada Bea"],
    },
    {
      name: "matches an existing card's name ignoring case and spaces",
      events: ["Y14 Women's Foil"],
      rows: [row("Ada", " y14 women's foil ")],
      want: ["Y14 Women's Foil: Ada"],
    },
    {
      name: "fills the blank first card, then adds a card per remaining event in file order",
      events: [""],
      rows: [row("Ada", "Div II Epee"), row("Bea", "Y14 Foil"), row("Cy", "Div II Epee")],
      want: ["Div II Epee: Ada Cy", "Y14 Foil: Bea"],
    },
    {
      name: "leaves named cards without a match alone",
      events: ["Veteran Sabre"],
      rows: [row("Ada", "Y14 Foil")],
      want: ["Veteran Sabre: ", "Y14 Foil: Ada"],
    },
    {
      name: "skips invalid and duplicate rows",
      events: [""],
      rows: [row("Ada", ""), row("Bea", "", "invalid"), row("Ada", "", "duplicate")],
      want: [": Ada"],
    },
  ])("$name", ({ events, rows, want }) => {
    expect(summarize(importFencers(events.map((name) => newEventDraft(name)), rows))).toEqual(want);
  });

  it("replaces a card's fencers rather than adding to them on a second upload", () => {
    const once = importFencers([newEventDraft("Y14 Foil")], [row("Ada", "Y14 Foil")]);

    expect(summarize(importFencers(once, [row("Ada", "Y14 Foil")]))).toEqual(["Y14 Foil: Ada"]);
  });

  it("reopens a saved card whose fencers it replaces, and leaves other saved cards", () => {
    const saved = [newEventDraft("Y14 Foil"), newEventDraft("Veteran Sabre")].map((event) => ({ ...event, saved: true }));

    const [replaced, untouched] = importFencers(saved, [row("Ada", "Y14 Foil")]);

    expect([replaced.saved, untouched.saved]).toEqual([false, true]);
  });

  it("gives every imported fencer its own id", () => {
    const [event] = importFencers([newEventDraft()], [row("Ada", ""), row("Bea", "")]);

    expect(new Set(event.fencers.map((fencer) => fencer.id)).size).toBe(2);
  });
});

describe("missingEventFields", () => {
  it.each([
    {
      name: "lists every empty required field of a new card",
      patch: {},
      want: ["name", "date", "time", "weapon", "genderMix", "ageCategory", "ratingLevel", "qualifier"],
    },
    {
      name: "treats whitespace as empty",
      patch: { name: "  ", date: "2026-11-20", time: "09:00", weapon: "Foil", genderMix: "Women", ageCategory: "Y14", ratingLevel: "Open", qualifier: "No" },
      want: ["name"],
    },
    {
      name: "is empty once everything is filled",
      patch: { name: "Y14 Foil", date: "2026-11-20", time: "09:00", weapon: "Foil", genderMix: "Women", ageCategory: "Y14", ratingLevel: "Open", qualifier: "No" },
      want: [],
    },
  ])("$name", ({ patch, want }) => {
    expect(missingEventFields({ ...newEventDraft(), ...patch })).toEqual(want);
  });
});

describe("eventTitle", () => {
  it.each([
    { name: "Y14 Foil", want: "Y14 Foil" },
    { name: "  ", want: "Event 3" },
  ])("calls a card named \"$name\" $want", ({ name, want }) => {
    expect(eventTitle(newEventDraft(name), 2)).toBe(want);
  });
});

describe("missingFencerFields", () => {
  it.each([
    { name: "a blank fencer", patch: {}, want: ["firstName", "lastName", "gender", "birthdate", "division"] },
    {
      name: "a complete fencer",
      patch: { firstName: "Ada", lastName: "Lovelace", gender: "F", birthdate: "2011-03-14", division: "New England" },
      want: [],
    },
  ])("lists what POST /competitors still needs for $name", ({ patch, want }) => {
    expect(missingFencerFields({ ...newFencerDraft(), ...patch })).toEqual(want);
  });
});

describe("formatRating", () => {
  it.each([
    { rating: "C", ratingYear: 2024, want: "C24" },
    { rating: "D", ratingYear: undefined, want: "D" },
    { rating: "U", ratingYear: undefined, want: "U" },
  ] as const)("formats $rating $ratingYear as $want", ({ rating, ratingYear, want }) => {
    expect(formatRating({ ...row("Ada", "").competitor, rating, ratingYear })).toBe(want);
  });
});
