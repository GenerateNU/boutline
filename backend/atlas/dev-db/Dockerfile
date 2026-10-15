# Dev database for `atlas migrate diff`/`validate`. Plain postgres:17 can't
# resolve gin_trgm_ops when atlas normalizes the desired-state schema, since
# pg_trgm doesn't exist yet there and atlas's desired-state parser refuses to
# let Atlas Community declare extensions. Pre-installing it into template1
# here means every database atlas spins up from this image already has it.
FROM postgres:17.11-alpine

COPY pg_trgm.sql /docker-entrypoint-initdb.d/
