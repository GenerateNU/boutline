-- Modify "events" table
ALTER TABLE "events" DROP CONSTRAINT "chk_events_rating_limit", ADD CONSTRAINT "chk_events_rating_limit" CHECK (rating_limit = ANY (ARRAY['open'::text, 'div_1a'::text, 'c_and_above'::text, 'b_and_under'::text, 'c_and_under'::text, 'd_and_under'::text, 'e_and_under'::text, 'unrated'::text]));
