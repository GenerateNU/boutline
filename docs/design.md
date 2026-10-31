# Boutline design

Boutline runs fencing tournaments end to end: an organizer sets up a tournament and
its events, fencers are placed into pools, pool results seed a direct-elimination
tableau, and referees score every bout live from a phone while everyone else
follows along. This document describes every feature: what it is for, its data,
its API, its rules, and its screens. It also records how far each one is built.

Each feature is tagged:

- **Built**: working end to end against the real API.
- **Partial**: the backend exists but the UI is placeholder, or the reverse.
- **Planned**: specified here, not yet in code. Treat these sections as the
  proposed design and amend them through review.

When code and this document disagree, fix one of them in the same PR.

---

## 1. Users and roles

| Role | Scope | Can |
| --- | --- | --- |
| Spectator / fencer | public, no account needed | browse tournaments, events, pools, tableau, results, live scores |
| Account holder | global | create tournaments, be added as staff |
| Tournament **admin** | one tournament | edit it, run its lifecycle, manage events, competitors, staff, pools, brackets |
| Tournament **referee** | one tournament | start, score and end bouts they are assigned to |

Roles are per tournament (`tournament_users.role`: `admin` | `referee`). There is no
global superuser. A user can hold different roles in different tournaments.

**Status:** roles are stored, but **nothing enforces them yet** (see §15).

---

## 2. Domain model

```mermaid
erDiagram
    users ||--o{ tournament_users : "has roles"
    tournaments ||--o{ tournament_users : staff
    users ||--o{ tournaments : created_by
    tournaments ||--o{ events : ""
    tournaments |o--o{ competitors : ""
    tournaments ||--o{ bouts : ""
    events ||--o{ pool_stages : ""
    pool_stages ||--o{ pools : ""
    events ||--o{ direct_eliminations : "event_id (no FK yet)"
    direct_eliminations ||--o{ direct_elimination_entries : "planned"
    competitors ||--o{ direct_elimination_entries : "planned"
    pools |o--o{ bouts : pool_id
    direct_eliminations |o--o{ bouts : "planned"
    users |o--o{ pools : referee_id
    users |o--o{ bouts : referee_id
    competitors ||--o{ bouts : competitor_1_id
    competitors ||--o{ bouts : competitor_2_id
    bouts ||--o{ scorings : "one row per touch"
```

Links labelled "planned" come from the bracket plan (§10).

| Entity | Meaning |
| --- | --- |
| **User** | a person with an account (organizer, referee) |
| **Tournament** | a dated competition with a join code, e.g. "Boston Fall Open" |
| **TournamentUser** | a user's staff role in one tournament |
| **Event** | one competition inside a tournament, e.g. "Y14 Men's Foil" |
| **Competitor** | a fencer entered in a tournament, with rating and club |
| **PoolStage** | the round-robin round of an event |
| **Pool** | one group of fencers within a pool stage, with a referee |
| **DirectElimination** | the knockout round of an event |
| **DirectEliminationEntry** | a fencer who made the cut into a tableau, with their seed (planned) |
| **Bout** | one match between two competitors |
| **Scoring** | one touch awarded in a bout. Undo marks it revoked, never deletes it |

All IDs are UUIDs except `scorings.id` (bigserial, so touches sort by insert order).

---

## 3. Lifecycles

Every stateful entity moves forward only. Transitions are guarded in SQL
(`UPDATE … WHERE status IN (…)`), so two racing requests cannot both succeed; the
loser gets `409`.

| Entity | States | Transitions | Built? |
| --- | --- | --- | --- |
| Tournament | `pending → active → end` | `POST /tournaments/{id}/start`, `/complete` | Built |
| Event | `upcoming → active → ended` | none yet | **Planned**: start when its pool stage starts, end when its DE ends |
| PoolStage | `upcoming → active → ended` | none yet | **Planned**: start when the first pool bout starts, end when all pool bouts end |
| Pool | no status column | none | **Planned**: derive from its bouts; `started_at` / `completed_at` exist but are never written |
| DirectElimination | `upcoming → active → ended` | `POST /direct-eliminations/{id}/start`, `/complete` | Built |
| Bout | `upcoming → active → end` | `POST /bouts/{id}/start`, `/end` | Built |

What each state allows:

- **Tournament**: name, visibility and start time are editable while `pending` or
  `active`. Bouts can only be created and started while `active`. `end` freezes the
  tournament row (other tables are not frozen yet; see §15).
- **Event / PoolStage**: editable and deletable only while `upcoming`.
- **DirectElimination**: editable while `upcoming` or `active`.
- **Bout**: editable only while `upcoming`; deletable while `upcoming` or `end`.
  Starting a bout requires an active tournament and an assigned referee.

> Vocabulary is inconsistent: tournaments and bouts end in `end`, everything else in
> `ended`. Unify to `ended` in one migration before more code depends on it.

---

## 4. Accounts and authentication

**Status:** Partial. Users can be created, but there is no login.

### Built
- `users`: `id`, `email` (unique, lowercased, validated with `net/mail`), `password`
  (bcrypt, 1–72 bytes), `first_name`, `last_name`, timestamps.
- `POST /api/v1/users` (409 on duplicate email), `GET /users?q=` (trigram search on
  full name), `GET /users/{id}`, `PATCH /users/{id}` (names only), `DELETE /users/{id}`
  (409 if the user created a tournament, referees a bout or pool, or recorded a
  touch; memberships cascade).
- `GET /users/{id}/tournaments`: tournaments the user is staff on.
- The password is never returned.

### Login screen (`/login`)
A login / sign-up toggle with Name (sign-up only), Email and Password fields.
**Placeholder:** submitting always navigates to `/admin` and makes no request.

### Planned
- `POST /auth/login` checks the bcrypt hash and issues a session (an httpOnly cookie,
  so Server Components can read it). Also `POST /auth/logout` and `GET /auth/me`.
- Sign-up calls `POST /users`, then logs in.
- Auth middleware resolves the session to a user. `created_by`, `revoked_by` and the
  acting referee then come from the session, not the request body.
- Authorization helper `requireRole(tournamentID, admin|referee)` on every mutating
  route (§15 lists the open routes).
- Next.js middleware redirects `/admin/*` and `/…/referee` to `/login` when there is
  no session.
- Email and password change (TODO in `user/types.go`).

---

## 5. Tournaments

**Status:** backend Built. UI Partial: the public list works, everything else is
placeholder.

### Data
`tournaments`: `name` (1–120), `visibility` (`private` | `public`, default private),
`code` (unique 6-char join code), `status`, `created_by` (user), `start_time`,
`started_at`, `completed_at`.

### Join code
Six characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, which leaves out the
look-alikes 0/O and 1/I/L. Generated with `crypto/rand` and retried up to five times
on collision. Lookup is case-insensitive and trims whitespace:
`GET /tournaments/code/{code}`. Fencers and spectators join a private tournament by
typing the code.

### API (`/api/v1/tournaments`)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/` | create; the code is server-generated |
| GET | `/?q&status&limit&offset` | fuzzy name search, status filter |
| GET | `/{id}` | |
| GET | `/code/{code}` | join by code |
| PATCH | `/{id}` | name, visibility, start_time; 409 once ended |
| POST | `/{id}/start` | `pending → active` |
| POST | `/{id}/complete` | `active → end` |

Tournaments cannot be deleted (on purpose; soft delete is under consideration).

### Screens
- **`/tournaments`** (Built): a server-rendered list with a search box
  (a plain GET form that works without JS; with JS it updates `?q=` after a 300ms
  debounce), 20 per page, Previous/Next links, a status badge
  (Upcoming / Active / Ended), and empty states for "no results" and "no
  tournaments". Location is hardcoded as "City, Country", and the Filter button is
  inert.
- **`/tournaments/[id]`** (Placeholder): tabs Overview · Fencers · Clubs · Events.
  Overview should show name, venue, date and time, contact, the live events, and a
  join-code prompt for private tournaments. None of it calls the API yet.

### Planned
- Fields the creation form already collects but the backend lacks: location
  (city/state), venue, fees, sanctioning authority (askFRED, USA Fencing, FIE,
  Other), description. Add them to `tournaments`.
- Enforce visibility: private tournaments are hidden from the public list and
  readable only by staff or by someone holding the code.
- The creator becomes an `admin` member automatically on create (today they don't).
- Starting a tournament requires at least one event. Completing it requires every
  event to be `ended`.

---

## 6. Tournament staff

**Status:** backend Built (no UI).

`tournament_users`: primary key `(user_id, tournament_id)`, `role`. The rows are
deleted when either the user or the tournament is deleted.

| Method | Path | |
| --- | --- | --- |
| POST | `/tournaments/{id}/users` | add `{user_id, role}`; 409 if already a member |
| GET | `/tournaments/{id}/users` | list |
| PATCH | `/tournaments/{id}/users/{user_id}` | change role |
| DELETE | `/tournaments/{id}/users/{user_id}` | remove |

### Planned
- Guard against removing or demoting the last admin.
- Block staff changes once the tournament has ended.
- The creation form's free-text "Admins" field (comma-separated emails) resolves
  emails to users and adds them as admins.
- A Staff screen under the tournament for admins.

---

## 7. Events

**Status:** backend Partial (CRUD only), UI Placeholder.

### Data
`events`: `tournament_id`, `name` (1–200), `format` (only
`pool_then_direct_elimination`), `status`, `start_time`, `started_at`,
`completed_at`. Deleting an event also deletes its pool stages.

### API (`/api/v1/events`)
`POST /` (tournament must exist), `GET /?tournament_id&status`, `GET /{id}`,
`PATCH /{id}` and `DELETE /{id}` (both only while `upcoming`).

### Screens (all placeholder data)
- **`/tournaments/[id]/events`**: a hardcoded list of four events with a status chip
  (Past / Live / Upcoming).
- **`/tournaments/[id]/events/[eventId]`**: redirects to the Fencers tab. Tabs are
  Pooling · Fencers · Tableau · Results.

### Planned
Event attributes the creation form already collects, to add as columns:

| Field | Values |
| --- | --- |
| type | individual, team |
| weapon | foil, épée, sabre |
| gender | men, women, mixed (both boxes checked) |
| age category | Y8, Y10, Y12, Y14, Cadet, Junior, Senior, Veteran, Open |
| rating limit | e.g. "D and under", "Open" |
| seeding | by rating, by ranking points, random |
| format | `direct_elimination` (new), `pool_then_direct_elimination` |
| qualifier | boolean |
| fees, referees | money; list of referee users |

Rules:
- An event is created together with its stages: a `pool_then_direct_elimination`
  event gets one `pool_stage` and one `direct_elimination`; a `direct_elimination`
  event gets only the DE.
- Event status follows its stages: `active` when the first stage starts, `ended`
  when the DE completes.
- The events list gains search and a weapon/gender/age filter, and shows
  Past / Live / Upcoming from `status`.

---

## 8. Competitors and clubs

**Status:** backend Partial, UI Placeholder.

### Data
`competitors`: `tournament_id` (nullable for now), `first_name`, `last_name`,
`rating` (`A`–`E`, `U` = unrated, default U), `team` (free-text club, `''` when
none). There is no clubs table: a club is the distinct `team` values.

### API (`/api/v1/competitors`)
`POST /`, `GET /?q&rating&team` (fuzzy name search), `GET /{id}`, `PATCH /{id}`
(an empty `team` clears it), `DELETE /{id}` (hard delete), and
`GET /search/teams?q&tournament_id`, which returns each club with its
`competitorCount`.

### Screens (placeholder)
Tournament **Fencers** and **Clubs** tabs and the event **Fencers** tab are static
text.

### Planned
- **Event entry**: fencers enter events, not tournaments. Add
  `event_entries(event_id, competitor_id, seed, checked_in_at)`, so one person can
  fence several events.
- Set `tournament_id` on create, and filter lists by tournament and event (neither
  is possible today).
- **Import** (the dropzones on the creation form): askFRED and USA Fencing CSV/XML
  exports create competitors with name, club and rating, and enter them into
  events.
- **Check-in**: admins mark fencers present. Only checked-in fencers are placed into
  pools.
- Rating includes the year (e.g. `B24`); this matters for seeding.
- Fencers tab: searchable list with rating and club. Clubs tab: clubs with counts,
  which drill down to their fencers.

---

## 9. Pools

**Status:** backend Partial (CRUD only, no generation or results), UI Placeholder.

### Data
- `pool_stages`: `event_id`, `max_competitor_per_pool` (≥ 2), `status`, `start_time`.
- `pools`: `pool_stage_id`, `referee_id`, `started_at`, `completed_at`.
- `bouts.pool_id` links a pool's bouts to the pool.

### API
- `/api/v1/pool-stages`: CRUD; edit and delete only while `upcoming`; delete is
  blocked once any of its pools has bouts.
- `/api/v1/pools`: CRUD; `PATCH` changes only the referee; delete is blocked
  (409) when the pool has bouts.

### Screen
**Pooling tab:** a list of pool bouts (round, names, score) linking to each bout.
The data is a hardcoded fixture shared by every event.

### Planned: pool data
- `pools.number` (≥ 1, unique per pool stage) labels the pool, and `pools.strip`
  is its strip assignment.
- `bouts.slot` (≥ 1, unique per pool) is a pool bout's place in the pool's bout
  order. Bouts created in one batch share a `created_at`, so the order needs a
  column. The same column holds a DE bout's bracket position (§10); a bout is in a
  pool or a tableau, never both.
- A pool's fencers are the competitors in its bouts. There is no pool-fencers
  table.
- A pool's bouts copy its strip (`location`), referee and number (`group_number`).
  Editing any of those on the pool updates its upcoming bouts in the same
  transaction, so they never go stale.

### Planned: pool generation
Generation is three steps, all admin only and only while the pool stage is
`upcoming`. The admin reviews and adjusts the proposal before anything is saved.
1. **Propose:** `POST /pool-stages/{id}/proposed-pools` takes the event's
   checked-in fencers (an optional `competitor_ids` overrides the list, and every
   id must be entered in the event) and returns pools without saving:
   - Seed by the event's `seeding` rule (rating, then rating year, then random
     tiebreak).
   - Pool count = `ceil(n / max_competitor_per_pool)`, with sizes as equal as
     possible (e.g. 20 fencers, max 7: pools of 7-7-6).
   - Snake the seeds across the pools (1→A, 2→B, 3→C, 4→C, 5→B, …).
   - **Club separation:** move fencers between pools at the same seeding level to
     minimise same-club pairs within a pool.
2. **Create:** `POST /pools` takes the adjusted pools and creates each one with
   every round-robin bout, in the standard bout order for its size so no one
   fences back-to-back. Pool bouts are to 5 touches with a 3-minute limit.
3. **Re-seat:** `PATCH /pools/{id}` with `fencers` replaces a pool's fencers and
   regenerates its bouts, while none of them has started.

Create and re-seat lock the pool stage row (`SELECT … FOR UPDATE`) and run every
check inside that transaction. Without the lock, two requests can seat the same
fencer in two pools, or re-seat a pool that has just started.

### Planned: pool results
`GET /pool-stages/{id}/results` returns each pool's grid and standings plus the
overall ranking, computed from ended bouts. It is also the read the Pools tab
uses, so there is no separate pool-board resource.

| Column | Meaning |
| --- | --- |
| V | victories |
| M | bouts fenced |
| V/M | win ratio, the primary sort key |
| TS / TR | touches scored / received |
| Ind | indicator = TS − TR, the second sort key |

Overall ranking: V/M desc, then Ind desc, then TS desc, otherwise tied. That
ranking seeds the DE, so the results endpoint and the DE draw (§10) share one
standings function. Each pool screen shows the classic grid (fencer × fencer,
`V5` / `D3` cells) plus the summary columns.

---

## 10. Direct elimination (tableau)

**Status:** backend Partial (round status only, no bracket), UI Placeholder.

### Data
`direct_eliminations`: `event_id` (no foreign key yet), `status`, `started_at`,
`completed_at`.

### API (`/api/v1/direct-eliminations`)
CRUD plus `POST /{id}/start` (`upcoming → active`) and `/complete` (`active → ended`).

### Screen
**Tableau tab:** the same placeholder bout list as Pooling.

### Planned: bracket
- Add a FK `direct_eliminations.event_id → events`.
- `direct_elimination_entries(direct_elimination_id, competitor_id, seed)`: the
  fencers who made the cut, with `seed` unique within a tableau. They are written
  once at the draw and never recomputed, so a pool score corrected afterwards
  cannot move anyone, and they are the only record of who has a bye. They are
  stored rather than recomputed from the pool ranking so an organizer can leave
  out a fencer who withdraws after pools, or correct a seed, without touching
  pool results.
- Add `bouts.direct_elimination_id` and `bouts.round_size` (fencers in the round:
  64, 32, …, 2 is the final). A DE bout reuses `bouts.slot` (§9) as its 1-based
  position in the round, top to bottom, with `competitor_1` as the top fencer. The
  bouts at slots 2k−1 and 2k feed slot k of the next round.
  `(direct_elimination_id, round_size, slot)` is unique.
- `POST /direct-eliminations/{id}/generate`, admin only, while `upcoming`, and only
  once the event's pool stage has ended (which already requires every pool to have
  ended). It takes the pool ranking, applies an optional cut (e.g. advance the top
  80%), breaks remaining ranking ties at random, and writes the entries. The
  bracket size is the next power of two ≥ n. Seeds are placed in standard bracket
  order (1 v 64, 32 v 33, …), and the top seeds receive byes for the empty
  positions.
- The draw creates only first-round bouts, one per position with two fencers; a
  bye has no bout. A DE bout is only ever created with both fencers known, so
  `competitor_1_id` and `competitor_2_id` stay required.
- When the last bout of a round ends, the next round is created from its winners,
  joined in the second round by the fencers with byes. Two bouts can end at once,
  so creating a round must be idempotent: an insert that hits the unique slot
  index means the round already exists, not an error. The final ending completes
  the DE and the event.
- DE bouts are to 15 touches: three 3-minute periods with a 1-minute break.
- Final placings: 1, 2, 3 and 3 (no bronze bout), then by round of elimination,
  ties within a round broken by seed.
- `GET /events/{id}/tableau` (public) returns every round from the bracket size
  down to the final, each with its bouts in slot order and each fencer's seed.
  Rounds not yet created come back with no bouts.
- The Tableau tab shows the bracket by round, with live scores on active bouts.
  Positions without a bout (byes, rounds not yet created) are drawn empty.

---

## 11. Bouts and live scoring

### 11.1 Bouts
**Status:** backend Built.

`bouts`: `tournament_id`, `pool_id?`, `referee_id?`, `competitor_1_id`,
`competitor_2_id` (must differ), `points_to_win` (> 0), `time_limit_seconds?`,
`location?` (strip number, max 200 chars), `group_number`, `start_time`,
`status`, `started_at`, `completed_at`.

| Method | Path | Rules |
| --- | --- | --- |
| POST | `/bouts` | tournament must be active; the pool must belong to the same tournament |
| GET | `/bouts?tournament_id&pool_id&status` | |
| GET | `/bouts/{id}` | |
| PATCH | `/bouts/{id}` | only while `upcoming` |
| POST | `/bouts/{id}/start` | tournament active, referee assigned, `upcoming → active` |
| POST | `/bouts/{id}/end` | `active → end` |
| DELETE | `/bouts/{id}` | only while `upcoming` or `end` |

The **bout page** (`…/bout/[boutId]`) shows two score tiles, a "Referee view" button
and a touch log. It is fed by the placeholder fixture, but its referee link goes to
the real API.

### 11.2 Scoring API
**Status:** Built.

`scorings`: `bout_id`, `competitor_id`, `points` (≥ 1, default 1), `created_by`,
`revoked_at`, `revoked_by`. A touch is never deleted. Undo sets `revoked_at`.

| Method | Path | |
| --- | --- | --- |
| POST | `/scoring` | award a touch |
| GET | `/scoring/{id}` | |
| PATCH | `/scoring/{id}` | change points or competitor; 409 if revoked |
| POST | `/scoring/{id}/revoke` | undo; 409 if already revoked (race-safe) |
| GET | `/scoring/match/{bout_id}?include_revoked` | live touches, paginated |
| GET | `/scoring/match/{bout_id}/history` | every touch, newest first, with running `competitor_1_score` / `competitor_2_score`; never paginated |

### 11.3 Referee screen (`…/bout/[boutId]/referee`)
**Status:** Built, apart from the auth gate. This is the only screen fully wired to
the backend.

**Phases**

| Phase | When | Referee sees |
| --- | --- | --- |
| `not-started` | bout `upcoming` | "Start match" |
| `scoring` | active, no winner | a large "Touch {name}" button per fencer, Undo, a match-point banner when a side is one touch away (both sides can be) |
| `confirming` | a side reached `points_to_win` | "{winner} wins A–B", one confirm button per fencer, Undo |
| `over` | bout `end` | the winner banner; no controls |

**Rules**
- The score is the sum of a fencer's live (unrevoked) touches. The winner is the
  first side to reach `points_to_win`.
- **One action in flight.** Touch, undo, start and end go through a single queue
  that refuses new input while a request is pending. Touches show immediately as
  "Saving…" rows (optimistic) and settle when the server replies.
- **Undo** revokes the most recent live touch, whichever fencer it belongs to.
  Available in `scoring` and `confirming`.
- **Two-party confirmation.** The bout ends only when both fencers have confirmed
  the same score. Each confirmation records the score version it was given
  against, so a touch or undo in between cancels earlier confirmations.
- **End guard.** The client refuses to end the bout if the number of touches it has
  confirmed differs from the tally it is ending on ("The score changed before the
  bout could end").
- **Recovery.** Any failed request shows an error, then reloads the bout, touches
  and history from the server, which wins.
- **History.** A newest-first log of time, "Touch {name}", running score
  (fencer 1 – fencer 2), with revoked touches kept and labelled "Revoked".
- Start assigns a referee if none is set, then starts the bout.

**Temporary bypass:** with no login, a fixed seeded user
(`FALLBACK_SCORER_ID`, Alex Morgan) is used as scorer and referee. The real
referee checks are commented out with TODOs. **Anyone with the URL can score any
bout** until §4 ships.

### 11.4 Planned scoring features
- Server-side scoring rules: reject touches on bouts that are not `active` or for
  competitors outside the bout, and end the bout automatically, or refuse further
  touches, at `points_to_win`. Today only the client enforces this.
- Idempotency: a client-generated `request_id` on `POST /scoring` (unique per bout),
  so a retried touch is not double-counted.
- Bout clock: start/stop, `time_limit_seconds` countdown, periods and the break for
  DE. At time with a tied score, priority is assigned at random and the bout goes
  one more minute.
- Cards: yellow (warning), red (penalty touch to the opponent), black (exclusion),
  recorded as scoring rows with a `kind`.
- Double touches (épée): one action awarding both fencers.
- Live updates for spectators (SSE or polling against `/history`). Redis is
  already connected and is the obvious pub/sub channel.
- Withdrawal / forfeit / abandonment as bout results.

---

## 12. Results

**Status:** Placeholder (static Results tab).

**Planned:** `GET /events/{id}/results` returns the final placings (from the DE,
or from the pool ranking for fencers cut after pools) with name, club, rating
and place. Admins can export them in askFRED / USA Fencing format. The Results tab
shows the table, and the tournament overview links each ended event's podium.

---

## 13. Organizer console

**Status:** Placeholder.

- **`/admin`**: a hub with "View tournaments" and "New tournament", plus inert menu
  buttons (tools, reports, view, save).
- **`/admin/tournaments`**: three hardcoded tournaments. **Planned:**
  `GET /users/{me}/tournaments`.
- **`/admin/tournament/new`**: a full form for tournament fields (§5), import
  dropzones (§8), admins (§6), and any number of event blocks (§7). **Placeholder:**
  submit discards the data and navigates away; the dropzones ignore their files;
  events cannot be removed.

**Planned flow:** submit creates the tournament, then its events, then imports
competitors and adds staff. It shows per-row errors and lands on the new
tournament. After that the admin runs check-in, generates pools, assigns referees,
starts the tournament, and generates the DE once pools end.

---

## 14. Cross-cutting

### API conventions
- Routes live under `/api/v1`, except `/healthcheck`. The OpenAPI spec is at
  `/openapi.json` and Swagger UI at `/docs`.
- Errors are RFC 9457 problem details. `400` invalid input from the service, `422`
  schema validation from Huma, `404` not found, `409` conflict or duplicate, and
  `500` with a generic message for anything else.
- Lists return `{data, total, limit, offset}`; `limit` defaults to 20 (max 100).
  The scoring history is the exception: always complete, never paginated. An
  `ids` filter (up to 100, e.g. a viewer's pinned items) returns every listed row,
  so its `limit` defaults to the number of ids rather than 20.
- Fuzzy search uses `pg_trgm` `word_similarity` on names and clubs. Terms shorter
  than 2 characters fall back to a prefix `ILIKE`.
- The frontend talks to the API through `apiRequest` (`/api/v1` is proxied by
  `next.config.ts`). Server Components fetch with `no-store`.

### Concurrency
Network code must survive retries and races:
- State transitions are conditional updates, as described in §3.
- Revoke and edit of a score are conditional on `revoked_at IS NULL`.
- No version columns, idempotency keys or transactions exist yet. Multi-step
  operations such as pool generation and DE advancement **must** run in one
  transaction.

### Infrastructure
Postgres (schema owned by Atlas migrations generated from the GORM models), Redis
(connected but unused), Docker dev stack (`make dev-up`), seeds at
`backend/seeds/seed.sql` (fixed UUIDs, idempotent).

---

## 15. Known gaps and inconsistencies

Found by reading the code, not by running it. Fix these before building on the
features they touch.

1. **No authorization.** Mutating routes require a login, but only competitor
   delete checks the caller's tournament role. Any logged-in user can start, end,
   edit or delete pools and pool stages. The planned pool create, re-seat and
   propose endpoints (§9) must not ship before the `requireRole` helper (§4).
   `created_by` on tournament create is still taken from the request body.
2. **Scoring has no server-side rules:** it accepts touches on upcoming or ended
   bouts and for competitors outside the bout (`scorings.competitor_id` has no FK).
3. Status words differ: `end` (tournament, bout) vs `ended` (event, stages).
4. JSON casing differs: snake_case for tournament, event, bout and scoring;
   camelCase for user and competitor.
5. Event and pool stage have no transitions; their `active` / `ended` states are
   unreachable.
6. `direct_eliminations.event_id` has no foreign key.
7. Deleting a bout with touches, or a competitor that appears in a bout, probably
   returns 500 instead of 409 (the FK error isn't translated).
8. `GET /scoring/match/{id}` sorts newest first; its description says "in the
   order they were recorded".
9. Ending a tournament doesn't freeze its events, staff or competitors.
10. `max_competitor_per_pool` is stored but nothing reads it.
11. With `points_to_win = 1`, both fencers show as on match point at 0–0.

---

## 16. Visual language

The UI is a **lofi** pass: monochrome, outlined, light mode only. Polish comes later
through the tokens, so components use tokens, never raw colors.

### Layout
- Mobile-first, one column:
  `mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10` (`max-w-mobile` is
  440px).
- Spacing: `gap-1`/`gap-2` inside a control, `gap-3`/`gap-4` between items in a list
  or section, `gap-10` between page sections.
- Group content with `Section`, whose title is a small uppercase muted label.

### Color tokens (`src/app/globals.css`)
| Token | Use |
| --- | --- |
| `background` / `foreground` | page and text; `foreground` is also the outline color |
| `muted` / `muted-foreground` | hover fills, secondary text, empty states |
| `selected` (blue) | only a chosen state: filled button, toggle on, active tab |
| `destructive` | errors and destructive actions |
| `border`, `input`, `ring` | hairlines, field borders, focus rings |

No Tailwind palette colors. The tournament status badge breaks this today
(`bg-amber-600`, `bg-emerald-600`); status colors become tokens next time it is
touched.

### Type
Geist Sans; Geist Mono for aligned numbers. Body and controls `text-sm`, metadata
`text-xs text-muted-foreground`, at most `font-medium`. Sizes from `text-2xl` up are
reserved for scores and bout banners. Referee scores go up to `text-9xl`.

### Shape and interaction
- `--radius` 0.625rem, with `rounded-sm`…`rounded-xl` derived from it. List cards
  use `rounded-md`; pills (tab nav, icon buttons, avatars) use `rounded-full`. 1px
  `border-foreground`, no shadows.
- Focus `focus-visible:ring-2 ring-ring`; hover `bg-muted`; disabled `opacity-50`.
- Icons from `lucide-react` at `size-4`, `aria-hidden` when decorative.
- Referee touch targets are large (`h-32`), because they are pressed under time
  pressure.

### Components
Primitives live in `src/components/primitives/`: shadcn-generated, restyled, `cva`
variants, `cn`, `data-slot`, behavior from `radix-ui`. A component used by one route
stays in that route's `_components/` until a second route needs it.

---

## 17. Open questions

- Hi-fi design: brand color, dark mode, and whether `selected` stays blue.
- Desktop layouts for the organizer console, which may outgrow 440px.
- Team events (relay scoring to 45) are in the form but have no model.
- Do spectators need accounts (to follow fencers) or stay anonymous?
- Should ratings and rankings come from a USA Fencing lookup instead of import?
- Does the Pools tab show a start time per pool? If not, pools need no
  `start_time` of their own.
