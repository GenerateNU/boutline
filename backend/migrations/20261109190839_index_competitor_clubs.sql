-- Create index "idx_competitors_primary_club_trgm" to table: "competitors"
CREATE INDEX "idx_competitors_primary_club_trgm" ON "competitors" USING GIN ("primary_club" gin_trgm_ops);
-- Create index "idx_competitors_secondary_club_trgm" to table: "competitors"
CREATE INDEX "idx_competitors_secondary_club_trgm" ON "competitors" USING GIN ("secondary_club" gin_trgm_ops);
