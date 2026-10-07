-- Modify "tournaments" table
ALTER TABLE "tournaments" DROP CONSTRAINT "fk_tournaments_creator", ADD CONSTRAINT "fk_users_created_tournaments" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT;
-- Modify "tournament_users" table
ALTER TABLE "tournament_users" DROP CONSTRAINT "fk_tournament_users_tournament", DROP CONSTRAINT "fk_tournament_users_user", ADD CONSTRAINT "fk_tournaments_memberships" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE, ADD CONSTRAINT "fk_users_memberships" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
