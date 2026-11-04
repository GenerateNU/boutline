## Context

Each competitor row belongs to a single tournament. When the same fencer enters three tournaments, they appear as three separate rows, and nothing connects them. Issue #76 asks for a site-wide athlete profile so a fencer can see their results across tournaments.

What exists today:

- `competitors` stores only `first_name`, `last_name`, `rating`, `team`, `tournament_id`, and `user_id`.
- The CSV parser (`frontend/src/lib/competitor-import/parse-competitor-import.ts`) already reads a USA Fencing member number, but the value never reaches the backend.
- The only way to write competitors is `POST /api/v1/competitors`, which creates one at a time.
- Fuzzy name search already exists, backed by `pg_trgm`.

## Summary

1. Add an `athletes` table with one row per person, site-wide.
2. Add a nullable `athlete_id` column on `competitors`.
3. Match fencers by USA Fencing member number only.
4. Do the matching inline when a competitor is created, in the same transaction. No background job.
5. Add read endpoints: get a profile, list its tournament history (public tournaments only), and search by name.

> **Limitation:** aggregation only works for fencers who have a USA Fencing member number. Everyone else, such as international fencers, gets a new profile every time they're uploaded, so they'll have one profile per tournament. International federations such as the FIE do have their own IDs, but they distribute that data as XML files, which is out of scope.

## Data Model

**New table `athletes`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `first_name`, `last_name` | text not null | Display name, set on the first upload |
| `member_number` | text, nullable, unique | The matching key |
| `user_id` | uuid, nullable, unique, FK → users | Empty until the claim ticket ships |
| `created_at`, `updated_at` | timestamptz | |

The table also gets a trigram index on the full name for search.

**Change to `competitors`:** add `athlete_id uuid NULL`, a foreign key to athletes with `ON DELETE SET NULL`, and an index. Rating and team stay on the competitor row, since they describe the fencer at that particular tournament.

## Matching Rule

### The USA Fencing member number

- **Origin:** USA Fencing assigns the number when someone buys a membership. It stays the same through renewals and club changes.
- **Coverage:** sanctioned tournaments require a membership, so nearly every fencer at a sanctioned event has a number.
- **How organizers get it:** fencers enter it when they register, and it shows up in the entry lists organizers export.
- **How it gets into Boutline:**
  - The CSV upload's `member`/`memberNumber` column. The parser already reads it and already flags duplicates within a file.
  - An optional field when an organizer adds a competitor manually.
- **When it's missing:** international fencers, local or unsanctioned events, CSVs that don't include the column, and walk-ins. A missing number never blocks an upload. The fencer just gets a new profile, so they end up with one profile per tournament.

### Why only the member number

| Option | Problem |
|---|---|
| Name (exact or fuzzy) | Names aren't unique. Two different people with the same name would be merged. |
| Name + club | Fencers change clubs, and club names aren't written consistently. |
| Name + birthdate | We'd have to store birthdates, many of them for minors, only to do matching. |
| **Member number** | Unique to each person by design, and already in the organizer's data. |

Merging two different people is much worse than leaving one person with two profiles. A wrong merge shows a fencer someone else's results. A duplicate just splits one fencer's history until the profiles are merged.

### Prior art

- **FencingTime**, the software behind FencingTimeLive, prefers the member number "since it is a unique way to identify fencers." It falls back to an exact name match, and drops fencers it can't match on import ([User's Guide v4.7](https://fencingtime.s3.amazonaws.com/FencingTimeUsersGuide.pdf), Ch. 11).
- **askFRED** also matches on the USA Fencing number and checks it against USA Fencing ([help](https://help.askfred.net/en/articles/14670262-troubleshooting-membership-number-issues)).
- We take the same approach. The one difference is that we create a new profile instead of dropping the fencer, so an upload never silently loses someone.

### Steps

1. Normalize the number: trim whitespace and strip leading zeros, because spreadsheets often add or remove them. We don't validate the format.
2. If there is no number, always create a new athlete. Fencers without a number get one profile per upload.
3. If the number is new, create an athlete and store the number on it.
4. If the number already exists, link the competitor to that athlete.

When a number matches:

- The profile name is never overwritten, so a typo in a later CSV can't rename a profile.
- The athlete is linked even if the uploaded name is different. Names vary for harmless reasons, like "Alex" vs "Alexander" or missing accents. The competitor row keeps the uploaded name. If an organizer typed the wrong number, fixing that competitor fixes the link.
- If two uploads with the same new number arrive at the same time, they can't create two athletes. A unique index plus `INSERT … ON CONFLICT (member_number)` returns the same athlete to both.
- The member number is never returned by the API, so it can't be used to claim someone else's profile.

## API

**Modified**

- `POST /api/v1/competitors` accepts an optional `memberNumber`.
- Competitor responses include `athleteId`.

**New** (`backend/internal/features/athlete/`)

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/athletes?q=` | Fuzzy search by name |
| `GET /api/v1/athletes/{id}` | Get a profile |
| `GET /api/v1/athletes/{id}/competitors` | Tournament history. Public tournaments only |

## Out of Scope

- Claiming a profile. Implementing this could help with handling any fencers who do not have a number (may be addressed in future tickets)
- A bulk CSV import endpoint.
- Backfilling existing competitors. They have no member numbers, so there is nothing to match them on.
- Importing data from outside Boutline, such as askFRED, USA Fencing, or FIE XML files. We only aggregate tournaments run on Boutline, so profiles are built as fencers are registered here.
- Merging duplicate profiles.
- Storing birthdate, country, or gender.