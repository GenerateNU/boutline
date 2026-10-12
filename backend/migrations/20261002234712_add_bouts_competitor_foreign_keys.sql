-- Modify "bouts" table
ALTER TABLE "bouts" ADD CONSTRAINT "fk_bouts_competitor1" FOREIGN KEY ("competitor_1_id") REFERENCES "competitors" ("id") ON UPDATE CASCADE ON DELETE RESTRICT, ADD CONSTRAINT "fk_bouts_competitor2" FOREIGN KEY ("competitor_2_id") REFERENCES "competitors" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
