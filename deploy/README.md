# boutline on the shared droplet

boutline's backend runs on the DigitalOcean droplet that Generate projects
share, next to the other projects' backends. That droplet's shared stack
(Caddy, plus a Postgres holding only preview databases) and how to provision
it from scratch are documented once, in
[inspirate-consulting's `deploy/README.md`](https://github.com/GenerateNU/inspirate-consulting/blob/main/deploy/README.md).
This directory is only what boutline adds on top.

```
droplet
├── caddy                    shared: TLS + routing from container labels
├── preview-db               shared: disposable preview databases
├── boutline-backend         →  api.<boutline-domain>      (deploy/app/)
└── boutline-pr-<n>          →  boutline-pr-<n>.<preview-domain>
                                database boutline_pr_<n>
```

**Nothing irreplaceable lives here.** Production data is in Supabase; the
droplet only holds containers and throwaway preview databases.

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
echo "preview.generatenu.com" > preview-domain
```

`DB_PASSWORD` in `preview.env` must match `PREVIEW_DB_PASSWORD` in
`/opt/shared/.env`. Preview containers connect to that Postgres as superuser,
and `preview-up.sh` reads the password from this file.

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
| `*.<preview-domain>` | droplet IP | Already exists for the shared stack; covers `boutline-pr-<n>` |

## Day-to-day

**Inspect a preview database.**

```sh
ssh deploy@<droplet-ip> 'docker exec -it preview-db psql -U postgres -d boutline_pr_123'
```

**Clean up an orphaned preview** (cleanup failed, or the PR predates this):

```sh
ssh deploy@<droplet-ip> bash -s -- 123 < deploy/preview-down.sh
```

**Logs.** `ssh deploy@<droplet-ip> docker logs --tail 100 boutline-backend`
