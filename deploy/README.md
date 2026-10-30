# boutline on the shared droplet

boutline's backend runs on the DigitalOcean droplet that Generate projects
share, next to the other projects' backends. That droplet's shared stack
(Caddy, plus a Postgres holding only preview databases) and how to provision
it from scratch live in [GenerateNU/droplet](https://github.com/GenerateNU/droplet),
along with the rules every project's deploy scripts follow there. This
directory is only what boutline adds on top.

```
droplet
├── caddy                    shared: TLS + routing from container labels
├── preview-db               shared: disposable preview databases
├── boutline-backend         →  api.<boutline-domain>      (deploy/app/)
├── boutline-db              production Postgres, boutline's network only
├── boutline-redis           production Redis, boutline's network only
└── boutline-pr-<n>          →  boutline-pr-<n>.<preview-domain>
                                database boutline_pr_<n>
```

**Production data lives here and nothing backs it up.** That is a deliberate
choice while boutline has no real users. It sits in the `boutline_pgdata`
volume, so a lost droplet or a `docker compose down --volumes` deletes it.
Before real users arrive, add off-droplet backups (a nightly `pg_dump` to
DigitalOcean Spaces) or move to Managed PostgreSQL.

`boutline-db` is only on boutline's own `internal` network, never on the shared
`edge` network. Preview containers join `edge`, and none of them should be able
to reach production data.

Preview container, database, and hostname are all prefixed with `boutline`
because every project shares one `preview-db` and one preview wildcard. A bare
`pr-12` would collide with PR #12 of another repo.

## Set boutline up on the droplet

Once, after the shared stack is running (`docker network ls` shows `edge`):

```sh
ssh deploy@<droplet-ip>
sudo install -o deploy -g deploy -d /opt/boutline
cd /opt/boutline
# fill in from deploy/app/, then copy up:
#   backend.env.example  -> backend.env
#   preview.env.example  -> preview.env
chmod 600 backend.env preview.env

# The shared preview domain, read by preview-up.sh:
echo "boutline-preview.generatenu.com" > preview-domain
```

`DB_PASSWORD` in `backend.env` is a new password for boutline's production
database (`openssl rand -hex 32`). It initialises `boutline-db` the first time
the stack starts.

`DB_PASSWORD` in `preview.env` must match `PREVIEW_DB_PASSWORD` in
`/opt/shared/.env`. Preview containers connect to that Postgres as superuser,
and `preview-up.sh` reads the password from this file.

`JWT_SECRET` in `backend.env` is production's token signing key
(`openssl rand -hex 32`); the backend refuses to start without one. Previews
need none in `preview.env`: `preview-up.sh` generates one per PR in
`preview-secrets/pr-<n>.env`, and `preview-down.sh` deletes it with the preview.

The deploy workflow copies `docker-compose.yml` up on every run, so it never
needs placing by hand.

The droplet's `docker login ghcr.io` token must be able to read this repo's
packages (`boutline/backend`, `boutline/migrate`) as well as the other
projects'. A classic PAT with `read:packages` covers every repo the token's
owner can see.

### DNS

| Record | Points at | Purpose |
| --- | --- | --- |
| `api.<boutline-domain>` | droplet IP | Production backend |
| `*.<preview-domain>` | droplet IP | Every `boutline-pr-<n>` preview hostname |

## Day-to-day

**Inspect a preview database.**

```sh
ssh deploy@<droplet-ip> 'docker exec -it preview-db psql -U postgres -d boutline_pr_123'
```

**Clean up an orphaned preview** (cleanup failed, or the PR predates this):

```sh
ssh deploy@<droplet-ip> bash -s -- 123 < deploy/preview-down.sh
```

**Open a shell on the production database.**

```sh
ssh deploy@<droplet-ip> 'docker exec -it boutline-db psql -U postgres -d boutline'
```

**Logs.** `ssh deploy@<droplet-ip> docker logs --tail 100 boutline-backend`
