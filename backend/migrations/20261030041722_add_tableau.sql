-- Modify "bouts" table
ALTER TABLE "bouts" ADD CONSTRAINT "chk_bouts_round_size" CHECK ((round_size >= 2) AND ((round_size & (round_size - 1)) = 0)), ADD CONSTRAINT "chk_bouts_single_stage" CHECK ((pool_id IS NULL) OR (direct_elimination_id IS NULL)), ADD CONSTRAINT "chk_bouts_slot" CHECK ((slot >= 1) AND (slot <= (round_size / 2))), ADD CONSTRAINT "chk_bouts_tableau_placement" CHECK (((direct_elimination_id IS NULL) = (round_size IS NULL)) AND ((round_size IS NULL) = (slot IS NULL))), ADD COLUMN "direct_elimination_id" uuid NULL, ADD COLUMN "round_size" bigint NULL, ADD COLUMN "slot" bigint NULL, ADD CONSTRAINT "fk_bouts_direct_elimination" FOREIGN KEY ("direct_elimination_id") REFERENCES "direct_eliminations" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
-- Create index "idx_bouts_direct_elimination_id" to table: "bouts"
CREATE INDEX "idx_bouts_direct_elimination_id" ON "bouts" ("direct_elimination_id");
-- Create index "idx_bouts_tableau_slot" to table: "bouts"
CREATE UNIQUE INDEX "idx_bouts_tableau_slot" ON "bouts" ("direct_elimination_id", "round_size", "slot");
-- Create "direct_elimination_entries" table
CREATE TABLE "direct_elimination_entries" (
  "direct_elimination_id" uuid NOT NULL,
  "competitor_id" uuid NOT NULL,
  "seed" bigint NOT NULL,
  "created_at" timestamptz NULL,
  "updated_at" timestamptz NULL,
  PRIMARY KEY ("direct_elimination_id", "competitor_id"),
  CONSTRAINT "fk_direct_elimination_entries_competitor" FOREIGN KEY ("competitor_id") REFERENCES "competitors" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fk_direct_elimination_entries_direct_elimination" FOREIGN KEY ("direct_elimination_id") REFERENCES "direct_eliminations" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "chk_direct_elimination_entries_seed" CHECK (seed >= 1)
);
-- Create index "idx_direct_elimination_entries_seed" to table: "direct_elimination_entries"
CREATE UNIQUE INDEX "idx_direct_elimination_entries_seed" ON "direct_elimination_entries" ("direct_elimination_id", "seed");
