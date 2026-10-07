-- Modify "scorings" table
ALTER TABLE "scorings" ADD CONSTRAINT "fk_scorings_bout" FOREIGN KEY ("bout_id") REFERENCES "bouts" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
