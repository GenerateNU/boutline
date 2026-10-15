-- Schema GORM has no way to declare: expression indexes. (CREATE EXTENSION is
-- left out on purpose — atlas's declarative schema parser treats extensions as
-- a paid feature and demands `atlas login`. The dev database already has
-- pg_trgm from replaying migrations/20261012020658_enable_fuzzy_search.sql
-- before this schema is normalized, so the operator class resolves fine.)
-- Embedded by main.go and appended to the gorm-derived schema so
-- `atlas migrate diff` sees the full desired state and stops trying to undo
-- that migration's indexes.
CREATE INDEX "idx_users_name_trgm" ON "users" USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX "idx_competitors_name_trgm" ON "competitors" USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX "idx_competitors_team_trgm" ON "competitors" USING gin (team gin_trgm_ops);
CREATE INDEX "idx_tournaments_name_trgm" ON "tournaments" USING gin (name gin_trgm_ops);
