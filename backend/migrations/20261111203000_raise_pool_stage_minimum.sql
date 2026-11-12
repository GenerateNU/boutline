-- Existing stages below the new minimum are raised to it first, since a pool of
-- 2 or 3 has no standard bout order and could never be created in them.
UPDATE "pool_stages" SET "max_competitor_per_pool" = 4 WHERE "max_competitor_per_pool" < 4;
-- Modify "pool_stages" table
ALTER TABLE "pool_stages" DROP CONSTRAINT "chk_pool_stages_max_competitor_per_pool", ADD CONSTRAINT "chk_pool_stages_max_competitor_per_pool" CHECK (max_competitor_per_pool >= 4);
