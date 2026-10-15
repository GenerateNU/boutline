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

-- Bare tournaments with no events or competitors, solely to push the unfiltered
-- row count past the default page size (20) so list/search pagination has a
-- second page to exercise. created_at is spaced one hour apart per row so
-- created_at DESC ordering (the no-term sort) is deterministic across pages.
INSERT INTO tournaments (id, name, visibility, code, status, created_by, start_time, started_at, completed_at, created_at, updated_at) VALUES
  ('b0000000-0000-4000-8000-000000000004', 'Pagination Fixture 01', 'public', 'P0FX01', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '1 hour',  now()),
  ('b0000000-0000-4000-8000-000000000005', 'Pagination Fixture 02', 'public', 'P0FX02', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '2 hours', now()),
  ('b0000000-0000-4000-8000-000000000006', 'Pagination Fixture 03', 'public', 'P0FX03', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '3 hours', now()),
  ('b0000000-0000-4000-8000-000000000007', 'Pagination Fixture 04', 'public', 'P0FX04', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '4 hours', now()),
  ('b0000000-0000-4000-8000-000000000008', 'Pagination Fixture 05', 'public', 'P0FX05', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '5 hours', now()),
  ('b0000000-0000-4000-8000-000000000009', 'Pagination Fixture 06', 'public', 'P0FX06', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '6 hours', now()),
  ('b0000000-0000-4000-8000-00000000000a', 'Pagination Fixture 07', 'public', 'P0FX07', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '7 hours', now()),
  ('b0000000-0000-4000-8000-00000000000b', 'Pagination Fixture 08', 'public', 'P0FX08', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '8 hours', now()),
  ('b0000000-0000-4000-8000-00000000000c', 'Pagination Fixture 09', 'public', 'P0FX09', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '9 hours', now()),
  ('b0000000-0000-4000-8000-00000000000d', 'Pagination Fixture 10', 'public', 'P0FX10', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '10 hours', now()),
  ('b0000000-0000-4000-8000-00000000000e', 'Pagination Fixture 11', 'public', 'P0FX11', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '11 hours', now()),
  ('b0000000-0000-4000-8000-00000000000f', 'Pagination Fixture 12', 'public', 'P0FX12', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '12 hours', now()),
  ('b0000000-0000-4000-8000-000000000010', 'Pagination Fixture 13', 'public', 'P0FX13', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '13 hours', now()),
  ('b0000000-0000-4000-8000-000000000011', 'Pagination Fixture 14', 'public', 'P0FX14', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '14 hours', now()),
  ('b0000000-0000-4000-8000-000000000012', 'Pagination Fixture 15', 'public', 'P0FX15', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '15 hours', now()),
  ('b0000000-0000-4000-8000-000000000013', 'Pagination Fixture 16', 'public', 'P0FX16', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '16 hours', now()),
  ('b0000000-0000-4000-8000-000000000014', 'Pagination Fixture 17', 'public', 'P0FX17', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '17 hours', now()),
  ('b0000000-0000-4000-8000-000000000015', 'Pagination Fixture 18', 'public', 'P0FX18', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '18 hours', now()),
  ('b0000000-0000-4000-8000-000000000016', 'Pagination Fixture 19', 'public', 'P0FX19', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '19 hours', now()),
  ('b0000000-0000-4000-8000-000000000017', 'Pagination Fixture 20', 'public', 'P0FX20', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '20 hours', now()),
  ('b0000000-0000-4000-8000-000000000018', 'Pagination Fixture 21', 'public', 'P0FX21', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '21 hours', now()),
  ('b0000000-0000-4000-8000-000000000019', 'Pagination Fixture 22', 'public', 'P0FX22', 'pending', 'a0000000-0000-4000-8000-000000000001', NULL, NULL, NULL, now() - interval '200 days' + interval '22 hours', now())
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

-- Competitors are tagged with the tournament they're entered in, except
-- Priya, Diego, and Marcus, left untagged to exercise competitors with no
-- tournament yet.
INSERT INTO competitors (id, tournament_id, first_name, last_name, rating, team, created_at, updated_at) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Maya', 'Chen',         'A', 'Boston Fencing Club',    now(), now()),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Liam', 'O''Brien',     'B', 'Northeastern Fencing',   now(), now()),
  ('d0000000-0000-4000-8000-000000000003', NULL, 'Priya', 'Patel',        'C', 'Cambridge FC',           now(), now()),
  ('d0000000-0000-4000-8000-000000000004', NULL, 'Diego', 'Martinez',     'U', '',                       now(), now()),
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'Hana', 'Sato',         'A', 'Northeastern Fencing',   now(), now()),
  ('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', 'Noah', 'Williams',     'D', 'Boston Fencing Club',    now(), now()),
  ('d0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'Amara', 'Okafor',       'B', 'Cambridge FC',           now(), now()),
  ('d0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'Ethan', 'Kowalski',     'E', '',                       now(), now()),
  ('d0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000001', 'Isabel', 'Moreau',       'B', 'Cambridge FC',           now(), now()),
  ('d0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000001', 'Tomas', 'Novak',        'C', 'Boston Fencing Club',    now(), now()),
  ('d0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000001', 'Grace', 'Lindqvist',    'A', 'Allez Fencing',          now(), now()),
  ('d0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000001', 'Omar', 'Haddad',       'D', 'Allez Fencing',          now(), now()),
  ('d0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000001', 'Yuki', 'Mori',         'U', 'Northeastern Fencing',   now(), now()),
  ('d0000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000001', 'Elena', 'Petrova',      'B', 'Cambridge FC',           now(), now()),
  ('d0000000-0000-4000-8000-000000000023', 'b0000000-0000-4000-8000-000000000001', 'Samuel', 'Adeyemi',      'C', 'Allez Fencing',          now(), now()),
  ('d0000000-0000-4000-8000-000000000024', 'b0000000-0000-4000-8000-000000000001', 'Clara', 'Bauer',        'E', 'Boston Fencing Club',    now(), now()),
  ('d0000000-0000-4000-8000-000000000025', 'b0000000-0000-4000-8000-000000000001', 'Nina', 'Kovacs',       'A', 'Northeastern Fencing',   now(), now()),
  ('d0000000-0000-4000-8000-000000000026', 'b0000000-0000-4000-8000-000000000001', 'Felix', 'Dubois',       'D', 'Cambridge FC',           now(), now()),
  ('d0000000-0000-4000-8000-000000000027', 'b0000000-0000-4000-8000-000000000001', 'Aisha', 'Rahman',       'B', '',                       now(), now()),
  ('d0000000-0000-4000-8000-000000000028', 'b0000000-0000-4000-8000-000000000001', 'Jonas', 'Berg',         'C', 'Allez Fencing',          now(), now()),
  ('d0000000-0000-4000-8000-000000000029', 'b0000000-0000-4000-8000-000000000001', 'Mei', 'Lin',          'U', 'Boston Fencing Club',    now(), now()),
  ('d0000000-0000-4000-8000-000000000030', 'b0000000-0000-4000-8000-000000000001', 'Pablo', 'Ruiz',         'E', 'Northeastern Fencing',   now(), now()),
  ('d0000000-0000-4000-8000-000000000031', 'b0000000-0000-4000-8000-000000000001', 'Freya', 'Olsen',        'A', 'Allez Fencing',          now(), now()),
  ('d0000000-0000-4000-8000-000000000032', 'b0000000-0000-4000-8000-000000000001', 'Andre', 'Silva',        'D', 'Cambridge FC',           now(), now()),
  ('d0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000002', 'Sofia', 'Rossi',        'C', 'Boston Fencing Club',    now(), now()),
  ('d0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000002', 'Kenji', 'Tanaka',       'U', 'Northeastern Fencing',   now(), now()),
  ('d0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000002', 'Leila', 'Haddad',       'D', 'Cambridge FC',           now(), now()),
  ('d0000000-0000-4000-8000-000000000012', NULL, 'Marcus', 'Johnson',      'B', '',                       now(), now()),
  ('d0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000003', 'Maya', 'Chen',         'A', 'Boston Fencing Club',    now(), now()),
  ('d0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000003', 'Kenji', 'Tanaka',       'U', 'Northeastern Fencing',   now(), now()),
  ('d0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000003', 'Hana', 'Sato',         'A', 'Northeastern Fencing',   now(), now()),
  ('d0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000003', 'Sofia', 'Rossi',        'C', 'Boston Fencing Club',    now(), now())
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
  ('e0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000003', 'Strip 1', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '5 hours 20 minutes', 'a0000000-0000-4000-8000-000000000003', 540, 15, 0, 'end', 'd0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000014', NULL, now() - interval '91 days', now()),
  ('e0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000003', 'Strip 2', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '5 hours', now() - interval '90 days' + interval '5 hours 25 minutes', 'a0000000-0000-4000-8000-000000000003', 540, 15, 0, 'end', 'd0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000016', NULL, now() - interval '91 days', now()),
  ('e0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000003', 'Strip 1', now() - interval '90 days' + interval '7 hours', now() - interval '90 days' + interval '7 hours', now() - interval '90 days' + interval '7 hours 30 minutes', 'a0000000-0000-4000-8000-000000000003', 540, 15, 0, 'end', 'd0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000015', NULL, now() - interval '91 days', now())
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
