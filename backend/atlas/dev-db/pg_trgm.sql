-- Runs once when the container's data directory is initialized, after
-- POSTGRES_DB (atlas names it "dev") is already cloned from template1 — so
-- enabling the extension in template1 alone is too late for that database.
-- Enable it in both: template1 for any database atlas creates later, "dev"
-- for the one it already created before this script ran.
\c template1
CREATE EXTENSION IF NOT EXISTS pg_trgm;
\c dev
CREATE EXTENSION IF NOT EXISTS pg_trgm;
