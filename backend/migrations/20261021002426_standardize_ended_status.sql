-- Existing rows still say 'end', so each constraint is dropped, the rows are
-- rewritten, and only then is the stricter constraint added back.
-- Modify "bouts" table
ALTER TABLE "bouts" DROP CONSTRAINT "chk_bouts_status";
UPDATE "bouts" SET "status" = 'ended' WHERE "status" = 'end';
ALTER TABLE "bouts" ADD CONSTRAINT "chk_bouts_status" CHECK (status = ANY (ARRAY['upcoming'::text, 'active'::text, 'ended'::text]));
-- Modify "tournaments" table
ALTER TABLE "tournaments" DROP CONSTRAINT "chk_tournaments_status";
UPDATE "tournaments" SET "status" = 'ended' WHERE "status" = 'end';
ALTER TABLE "tournaments" ADD CONSTRAINT "chk_tournaments_status" CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'ended'::text]));
