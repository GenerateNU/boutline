## Context

Each competitor row belongs to a single tournament. When the same fencer enters three tournaments, they appear as three separate rows, and nothing connects them. Issue #76 asks for a site-wide athlete profile so a fencer can see their results across tournaments.

What exists today:

- `competitors` stores only `first_name`, `last_name`, `rating`, `team`, `tournament_id`, and `user_id`.
- The CSV parser (`frontend/src/lib/competitor-import/parse-competitor-import.ts`) already reads a USA Fencing member number, but the value never reaches the backend.
- The only way to write competitors is `POST /api/v1/competitors`, which creates one at a time.
- Fuzzy name search already exists, backed by `pg_trgm`.

## Summary

1. Add an `athletes` table with one row per identified person, site-wide.
2. Add a nullable `athlete_id` column on `competitors`.
3. Match fencers by USA Fencing member number only.
4. Do the matching inline, right after the competitor is saved, on a best-effort basis. A matching failure never fails competitor creation. No background job.
5. Add read endpoints: get a profile, list its tournament history (public, ended tournaments only), and search by name.

> **Limitation:** aggregation only works for fencers who have a USA Fencing member number. Fencers without one, such as international fencers, don't get a profile in v1. Their entries still appear in each tournament's results. Other federations (the FIE and other national federations) issue their own IDs, which could be added later as separate profiles that a user claims together.

## Data Model

**New table `athletes`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `member_number` | text, not null, unique | The USA Fencing number, normalized. The matching key |
| `user_id` | uuid, nullable, unique, FK → users | Empty until the claim ticket ships |
| `created_at`, `updated_at` | timestamptz | |

**Change to `competitors`:**
- Add `athlete_id uuid NULL`, a foreign key to athletes with `ON DELETE SET NULL`, and an index.
- Add `member_number text NULL`, the normalized number as uploaded, so a failed link can be retried.
- Rating and team stay on the competitor row, since they describe the fencer at that particular tournament.

### Names

Athletes don't store a name. Each name describes something different:

| Name | Source of truth for |
|---|---|
| `competitors` | What was entered for that tournament. A historical record that never changes after the event |
| `users` | The account holder's name |
| Athlete display name | **Derived, not stored.** The name on the athlete's most recent public competitor, or the user's name once the profile is claimed |

The derived name lives in one repository method, so every endpoint resolves it the same way. Typo fixes and name changes show up automatically, and there's nothing to keep in sync. A fencer with no public entries has no public name, so they don't appear in search. Search reuses the existing competitor name index, and groups results by `athlete_id`.

## Matching Rule

### The USA Fencing member number

- **Origin:** USA Fencing assigns the number when someone buys a membership. It stays the same through renewals and club changes.
- **Coverage:** sanctioned tournaments require a membership, so nearly every fencer at a sanctioned event has a number.
- **How organizers get it:** fencers enter it when they register, and it shows up in the entry lists organizers export. askFRED doesn't issue its own ID. Fencers paste in their USA Fencing number, and askFRED checks it against USA Fencing.
- **How it gets into Boutline:**
  - The CSV upload's `member`/`memberNumber` column. The parser already reads it and already flags duplicates within a file.
  - An optional field when an organizer adds a competitor manually.
- **When it's missing:** international fencers, local or unsanctioned events, CSVs that don't include the column, and walk-ins. A missing number never blocks an upload. The competitor is saved without an athlete.

### Why only the member number

| Option | Problem |
|---|---|
| Name (exact or fuzzy) | Names aren't unique. Two different people with the same name would be merged. |
| Name + club | Fencers change clubs, and club names aren't written consistently. |
| Name + birthdate | We'd have to store birthdates, many of them for minors, only to do matching. |
| **Member number** | Unique to each person by design, and already in the organizer's data. |

Merging two different people is much worse than leaving an entry unlinked. A wrong merge shows a fencer someone else's results. An unlinked entry just leaves a gap in one fencer's history.

### Prior art

- **FencingTime**, the software behind FencingTimeLive, prefers the member number "since it is a unique way to identify fencers." It falls back to an exact name match, and drops fencers it can't match on import ([User's Guide v4.7](https://fencingtime.s3.amazonaws.com/FencingTimeUsersGuide.pdf), Ch. 11).
- **askFRED** also matches on the USA Fencing number and checks it against USA Fencing ([help](https://help.askfred.net/en/articles/14670262-troubleshooting-membership-number-issues)).
- We take the same approach, without the name fallback. Fencers we can't identify keep their tournament entry but get no profile.

### Steps

1. Save the competitor as today, including the normalized member number.
2. Normalize the number by trimming whitespace, then check the format: 9 digits starting with 1, the same rule askFRED uses. An invalid number is rejected with a validation error. The CSV parser can flag it before upload, as it already does for duplicates.
3. If there is no number, stop. `athlete_id` stays null.
4. Otherwise, upsert the athlete by member number (`INSERT … ON CONFLICT (member_number) … RETURNING id`) and set `athlete_id`. If two uploads with the same new number arrive at the same time, they still get one athlete.
5. If step 4 fails, log it and still return success. Because the upsert can safely be re-run, competitors with a number but no `athlete_id` can be retried later.

### Wrong numbers

- **A number that matches no one** (the likely case) creates a profile for the wrong number. Fixing the competitor's number re-runs matching.
- **A number that matches another fencer** links the entry to the wrong person. We don't block links by name, because names legitimately vary ("Alex" vs "Alexander", or a fencer registered under one name who goes by another). Instead:
  - When an import links a competitor to an existing profile, the import screen shows "Member number identified and linked to this profile: _name_. Unlink?" The admin does a quick visual check. This is a frontend ticket for the parsing screen.
  - **Unlinking** clears the member number on that competitor, which re-runs matching and leaves `athlete_id` null.
- The member number is never returned by the API.

### Spam

Member numbers are effectively public. FencingTracker shows them in profile URLs next to the fencer's name, organizers receive them in every askFRED export, and the format is easy to guess. Any user can create a tournament, so someone could add fake entries to another fencer's profile.

- We don't prevent deliberate spam in v1. Boutline isn't an official ranking, and fake tournaments are already possible without profiles.
- History only includes **public, ended** tournaments, which keeps test and abandoned tournaments off profiles.
- If spam happens, we unlink every competitor in the spammer's tournaments with a one-off query on `tournaments.created_by`. Users have no roles, so this is a manual fix by a developer.
- Claiming must not rely on the member number alone, since anyone can find it (see Open Questions).

## API

**Modified**

- `POST /api/v1/competitors` accepts an optional `memberNumber`.
- `PATCH /api/v1/competitors/{id}` accepts `memberNumber`. Changing it re-runs matching, and clearing it unlinks the competitor.
- Competitor responses include `athleteId`, and `memberNumber` for signed-in callers. Competitor reads are public, so an anonymous caller gets `memberNumber: null` rather than a scrapeable list of names with numbers.

**New** (`backend/internal/features/athlete/`)

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/athletes?q=` | Fuzzy search by derived name |
| `GET /api/v1/athletes/{id}` | Get a profile |
| `GET /api/v1/athletes/{id}/competitors` | Tournament history. Public, ended tournaments only |

## Out of Scope

- Claiming a profile. This ticket should also cover attaching unlinked entries (fencers without a number) to a profile, and claiming multiple profiles, for example one per federation.
- The import-screen "linked to this profile, unlink?" modal. This is a separate frontend ticket.
- A bulk CSV import endpoint.
- Backfilling existing competitors. They have no member numbers, so there is nothing to match them on.
- Importing data from outside Boutline, such as askFRED, USA Fencing, or FIE XML files. We only aggregate tournaments run on Boutline, so profiles are built as fencers are registered here.
- Other federations' IDs (FIE, national federations).
- Merging duplicate profiles.
- Storing birthdate, country, or gender.

## Open Questions

**Verified aggregation.** We can't restrict profiles to official (USA Fencing sanctioned) tournaments. There is no public registry or API of sanctioned tournaments: each Division sanctions its own events, and results are submitted to USA Fencing by hand. Our "authority" field is chosen by the organizer, so it doesn't prove anything.

*Proposed:* every link from a tournament entry to an athlete starts as **unverified**. It becomes **verified** when the claimed owner confirms it, or later, if we add an admin role, when an admin marks the tournament as official. Profiles could show verified results by default, and owners could hide entries they don't recognize. Out of scope for this ticket. Proposed for the claim ticket.
