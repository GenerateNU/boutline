-- Sample data for local development. Every row has a fixed id and every insert
-- skips conflicts, so rerunning this is a no-op rather than a duplicate set.
-- Times are relative to now() so the active tournament is always in progress
-- and the pending one is always ahead; now() is fixed for the transaction.
--
-- Every seeded account's password is "password123".

BEGIN;

INSERT INTO users (id, email, password, first_name, last_name, created_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'alex.morgan@boutline.dev',  '$2a$10$DOaE.gxzhdP6pfsKK4XnDOyjjlI/1eb1yhikghBaU1m6kCu3AdqCq', 'Alex',   'Morgan', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'jordan.lee@boutline.dev',   '$2a$10$DOaE.gxzhdP6pfsKK4XnDOyjjlI/1eb1yhikghBaU1m6kCu3AdqCq', 'Jordan', 'Lee',    now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'sam.rivera@boutline.dev',   '$2a$10$DOaE.gxzhdP6pfsKK4XnDOyjjlI/1eb1yhikghBaU1m6kCu3AdqCq', 'Sam',    'Rivera', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', 'taylor.kim@boutline.dev',   '$2a$10$DOaE.gxzhdP6pfsKK4XnDOyjjlI/1eb1yhikghBaU1m6kCu3AdqCq', 'Taylor', 'Kim',    now(), now()),
  ('a0000000-0000-4000-8000-000000000005', 'casey.nguyen@boutline.dev', '$2a$10$DOaE.gxzhdP6pfsKK4XnDOyjjlI/1eb1yhikghBaU1m6kCu3AdqCq', 'Casey',  'Nguyen', now(), now())
ON CONFLICT DO NOTHING;

-- Codes use the service's alphabet, which leaves out 0, 1, I, L and O.
INSERT INTO tournaments (id, name, visibility, code, status, created_by, start_time, started_at, completed_at, created_at, updated_at) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Fall Open 2026',           'public',  'F7KQ2M', 'active',  'a0000000-0000-4000-8000-000000000001', now() - interval '3 hours',  now() - interval '3 hours',  NULL,                                          now() - interval '14 days', now()),
  ('b0000000-0000-4000-8000-000000000002', 'Winter Classic 2026',      'private', 'W9TXH3', 'pending', 'a0000000-0000-4000-8000-000000000004', now() + interval '30 days',  NULL,                        NULL,                                          now() - interval '2 days',  now()),
  ('b0000000-0000-4000-8000-000000000003', 'Summer Invitational 2026', 'public',  'S4NPR8', 'end',     'a0000000-0000-4000-8000-000000000001', now() - interval '90 days',  now() - interval '90 days',  now() - interval '90 days' + interval '9 hours', now() - interval '120 days', now())
ON CONFLICT DO NOTHING;

-- Casey has no memberships, to exercise a signed-in user with nothing to run.
INSERT INTO tournament_users (user_id, tournament_id, role, created_at, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'admin',   now(), now()),
  ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'admin',   now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'referee', now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'referee', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'admin',   now(), now()),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'referee', now(), now()),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003', 'admin',   now(), now()),
  ('a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'referee', now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO events (id, tournament_id, name, status, start_time, started_at, completed_at, created_at, updated_at) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Mixed Épée',    'active',   now() - interval '3 hours',  now() - interval '3 hours',  NULL,                                          now() - interval '14 days',  now()),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Women''s Foil', 'upcoming', now() + interval '4 hours',  NULL,                        NULL,                                          now() - interval '14 days',  now()),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'Open Sabre',    'upcoming', now() + interval '30 days',  NULL,                        NULL,                                          now() - interval '2 days',   now()),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'Open Épée',     'ended',    now() - interval '90 days',  now() - interval '90 days',  now() - interval '90 days' + interval '9 hours', now() - interval '120 days', now())
ON CONFLICT DO NOTHING;

INSERT INTO competitors (id, first_name, last_name, rating, team, created_at, updated_at) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'Maya',    'Chen',      'A', 'Boston Fencing Club',  now(), now()),
  ('d0000000-0000-4000-8000-000000000002', 'Liam',    'O''Brien',  'B', 'Northeastern Fencing', now(), now()),
  ('d0000000-0000-4000-8000-000000000003', 'Priya',   'Patel',     'C', 'Cambridge FC',         now(), now()),
  ('d0000000-0000-4000-8000-000000000004', 'Diego',   'Martinez',  'U', '',                     now(), now()),
  ('d0000000-0000-4000-8000-000000000005', 'Hana',    'Sato',      'A', 'Northeastern Fencing', now(), now()),
  ('d0000000-0000-4000-8000-000000000006', 'Noah',    'Williams',  'D', 'Boston Fencing Club',  now(), now()),
  ('d0000000-0000-4000-8000-000000000007', 'Amara',   'Okafor',    'B', 'Cambridge FC',         now(), now()),
  ('d0000000-0000-4000-8000-000000000008', 'Ethan',   'Kowalski',  'E', '',                     now(), now()),
  ('d0000000-0000-4000-8000-000000000009', 'Sofia',   'Rossi',     'C', 'Boston Fencing Club',  now(), now()),
  ('d0000000-0000-4000-8000-000000000010', 'Kenji',   'Tanaka',    'U', 'Northeastern Fencing', now(), now()),
  ('d0000000-0000-4000-8000-000000000011', 'Leila',   'Haddad',    'D', 'Cambridge FC',         now(), now()),
  ('d0000000-0000-4000-8000-000000000012', 'Marcus',  'Johnson',   'B', '',                     now(), now())
ON CONFLICT DO NOTHING;

-- Mixed Épée is mid-way through its pool stage; Women's Foil has one planned
-- but not yet split into pools.
INSERT INTO pool_stages (id, event_id, max_competitor_per_pool, status, start_time, started_at, completed_at, created_at, updated_at) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 4, 'active',   now() - interval '3 hours', now() - interval '3 hours', NULL, now() - interval '14 days', now()),
  ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 6, 'upcoming', now() + interval '4 hours', NULL,                       NULL, now() - interval '14 days', now())
ON CONFLICT DO NOTHING;

INSERT INTO pools (id, pool_stage_id, referee_id, started_at, completed_at, created_at, updated_at) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', now() - interval '3 hours', NULL, now() - interval '1 day', now()),
  ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', now() - interval '3 hours', NULL, now() - interval '1 day', now())
ON CONFLICT DO NOTHING;

-- Fall Open runs two pools of four as round robins, mid-way through: pool 1 has
-- an active bout, and pool 2 has a bout still waiting on a referee. Summer
-- Invitational's bouts are its finished direct-elimination table (group 0).
INSERT INTO bouts (id, tournament_id, location, start_time, started_at, completed_at, referee_id, time_limit_seconds, points_to_win, group_number, status, competitor_1_id, competitor_2_id, pool_id, created_at, updated_at) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Strip 1', now() - interval '3 hours',             now() - interval '3 hours',             now() - interval '170 minutes', 'a0000000-0000-4000-8000-000000000002', 180, 5, 1, 'end',      'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Strip 1', now() - interval '165 minutes',          now() - interval '165 minutes',          now() - interval '155 minutes', 'a0000000-0000-4000-8000-000000000002', 180, 5, 1, 'end',      'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Strip 1', now() - interval '150 minutes',          now() - interval '150 minutes',          now() - interval '140 minutes', 'a0000000-0000-4000-8000-000000000002', 180, 5, 1, 'end',      'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'Strip 1', now() - interval '135 minutes',          now() - interval '135 minutes',          now() - interval '125 minutes', 'a0000000-0000-4000-8000-000000000002', 180, 5, 1, 'end',      'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Strip 1', now() - interval '5 minutes',            now() - interval '5 minutes',            NULL,                           'a0000000-0000-4000-8000-000000000002', 180, 5, 1, 'active',   'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000001', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'Strip 1', now() + interval '10 minutes',           NULL,                                    NULL,                           'a0000000-0000-4000-8000-000000000002', 180, 5, 1, 'upcoming', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Strip 2', now() - interval '3 hours',             now() - interval '3 hours',             now() - interval '170 minutes', 'a0000000-0000-4000-8000-000000000003', 180, 5, 2, 'end',      'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000006', 'f1000000-0000-4000-8000-000000000002', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'Strip 2', now() - interval '165 minutes',          now() - interval '165 minutes',          now() - interval '155 minutes', 'a0000000-0000-4000-8000-000000000003', 180, 5, 2, 'end',      'd0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000002', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', 'Strip 2', now() + interval '5 minutes',            NULL,                                    NULL,                           'a0000000-0000-4000-8000-000000000003', 180, 5, 2, 'upcoming', 'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000002', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001', 'Strip 2', now() + interval '20 minutes',           NULL,                                    NULL,                           'a0000000-0000-4000-8000-000000000003', 180, 5, 2, 'upcoming', 'd0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000002', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000001', 'Strip 2', now() + interval '35 minutes',           NULL,                                    NULL,                           NULL,                                   180, 5, 2, 'upcoming', 'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000008', 'f1000000-0000-4000-8000-000000000002', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000001', 'Strip 2', now() + interval '50 minutes',           NULL,                                    NULL,                           NULL,                                   180, 5, 2, 'upcoming', 'd0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000007', 'f1000000-0000-4000-8000-000000000002', now() - interval '1 day', now()),
  ('e0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000002', NULL,      now() + interval '30 days',             NULL,                                    NULL,                           NULL,                                   180, 5, 1, 'upcoming', 'd0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000010', NULL, now() - interval '2 days', now()),
  ('e0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000002', NULL,      now() + interval '30 days',             NULL,                                    NULL,                           NULL,                                   180, 5, 1, 'upcoming', 'd0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000012', NULL, now() - interval '2 days', now()),
  ('e0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000003', 'Strip 1', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '5 hours 20 minutes', 'a0000000-0000-4000-8000-000000000003', 540, 15, 0, 'end', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000010', NULL, now() - interval '91 days', now()),
  ('e0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000003', 'Strip 2', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '5 hours 25 minutes', 'a0000000-0000-4000-8000-000000000003', 540, 15, 0, 'end', 'd0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000009', NULL, now() - interval '91 days', now()),
  ('e0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000003', 'Strip 1', now() - interval '90 days' + interval '7 hours', now() - interval '90 days' + interval '7 hours', now() - interval '90 days' + interval '7 hours 30 minutes', 'a0000000-0000-4000-8000-000000000003', 540, 15, 0, 'end', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005', NULL, now() - interval '91 days', now())
ON CONFLICT DO NOTHING;

-- Open Épée's round is the finished table above; Mixed Épée's waits on its pools.
INSERT INTO direct_eliminations (id, status, event_id, started_at, completed_at, created_at, updated_at) VALUES
  ('f0000000-0000-4000-8000-000000000001', 'ended',    'c0000000-0000-4000-8000-000000000004', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '7 hours 30 minutes', now() - interval '91 days', now()),
  ('f0000000-0000-4000-8000-000000000002', 'upcoming', 'c0000000-0000-4000-8000-000000000001', NULL,                                          NULL,                                                      now() - interval '1 day',  now())
ON CONFLICT DO NOTHING;

-- Fixed ids bypass the sequence, so move it past them or the API's next insert collides.
DO $$ BEGIN PERFORM setval('scorings_id_seq', (SELECT max(id) FROM scorings)); END $$;

-- Touches for Maya's finished 5-2 win over Liam and her live bout against Diego,
-- where one touch was revoked so replay has something to show.
INSERT INTO scorings (id, created_by, points, competitor_id, bout_id, revoked_at, revoked_by, created_at, updated_at) VALUES
  (1,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', NULL,                          NULL,                                   now() - interval '179 minutes', now() - interval '179 minutes'),
  (2,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', NULL,                          NULL,                                   now() - interval '178 minutes', now() - interval '178 minutes'),
  (3,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', NULL,                          NULL,                                   now() - interval '177 minutes', now() - interval '177 minutes'),
  (4,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', NULL,                          NULL,                                   now() - interval '175 minutes', now() - interval '175 minutes'),
  (5,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', NULL,                          NULL,                                   now() - interval '174 minutes', now() - interval '174 minutes'),
  (6,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', NULL,                          NULL,                                   now() - interval '172 minutes', now() - interval '172 minutes'),
  (7,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', NULL,                          NULL,                                   now() - interval '171 minutes', now() - interval '171 minutes'),
  (8,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000005', NULL,                          NULL,                                   now() - interval '4 minutes',   now() - interval '4 minutes'),
  (9,  'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', NULL,                          NULL,                                   now() - interval '3 minutes',   now() - interval '3 minutes'),
  (10, 'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', now() - interval '2 minutes', 'a0000000-0000-4000-8000-000000000002', now() - interval '150 seconds', now() - interval '2 minutes'),
  (11, 'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000005', NULL,                          NULL,                                   now() - interval '1 minute',    now() - interval '1 minute'),
  (12, 'a0000000-0000-4000-8000-000000000002', 1, 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', NULL,                          NULL,                                   now() - interval '30 seconds',  now() - interval '30 seconds')
ON CONFLICT DO NOTHING;

COMMIT;
