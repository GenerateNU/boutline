# Deployment

| Piece | Runs on | Ships when |
| --- | --- | --- |
| Backend (production) | Shared DigitalOcean droplet | A GitHub Release is published |
| Frontend (production) | Vercel | A GitHub Release is published |
| Backend (PR preview) | Same droplet, one container + database per PR | Automatically, on every PR |
| Frontend (PR preview) | Vercel preview deployment | Automatically, on every PR |
| Production database | Postgres container on the same droplet | Migrations run on every release |

Merging to `main` deploys nothing. To ship, cut a release, and both halves go
out together.

## How the pieces fit together

```
https://<site>   (Vercel, Next.js)             https://api.<domain>  (droplet)
├── /api/*  ── rewritten in next.config.ts ──▶ boutline-backend ──▶ boutline-db
└── everything else: the Next.js app
```

The browser only ever calls same-origin `/api`, so there is **no CORS** and no
API hostname in the bundle. Paths are forwarded unchanged: `/api/v1/tournaments`
on the site is `/api/v1/tournaments` on the backend.

`frontend/next.config.ts` reads the target from `API_PROXY_TARGET`. Locally it
defaults to `http://localhost:8000`, so `make dev` needs no setup. On Vercel
the build fails if it is unset.

The droplet is described in [deploy/README.md](deploy/README.md).

## Day-to-day

### Ship to production

```sh
git checkout main && git pull
gh release create v1.2.0 --generate-notes
```

The workflow builds the backend and migration images from the tagged commit.
On the droplet it applies pending migrations as a separate step, then replaces
the backend. A failed migration stops the deploy, and the old backend keeps
serving. The workflow waits until `/healthcheck` reports **that commit** as its
version, and only then builds and publishes the frontend.

Migrations run while the old backend is still up, so keep them safe for the
version still running.

### Roll back

Actions → **Deploy production** → *Run workflow*, with an earlier tag. Images
are tagged by commit, so every past build is still deployable. Schema is not
part of a rollback. Undo a migration with a new forward migration.

The frontend alone can also be rolled back from Vercel → **Deployments** → pick
an earlier production deployment → **Instant Rollback**.

### Review a PR

Two comments appear on every PR:

- **Vercel** posts the frontend preview.
- **Preview backend** posts `https://boutline-pr-<n>.<preview-domain>`, with
  its own database migrated from that branch.

Both are destroyed when the PR closes.

By default the Vercel preview proxies to the **production** API, so clicking
through a preview reads and writes production data. To point previews at
their PR's backend, give `API_PROXY_TARGET` a different value for the
**Preview** environment in Vercel.

## Setup

### Vercel

Import the repository and set **Root Directory** to `frontend`. Vercel detects
Next.js and Bun from there, so leave the build settings at their defaults.
Then:

- **Settings → Environment Variables:** `API_PROXY_TARGET` =
  `https://api.<domain>`, for both Production and Preview.
- **Settings → General:** copy the **Project ID**, and the **Team ID** (or, on
  a personal account, the user ID under Account Settings) for `VERCEL_ORG_ID`.
- **Account Settings → Tokens:** create a token for `VERCEL_TOKEN`.

[frontend/vercel.json](frontend/vercel.json) turns off Git deployments of
`main`, so merging publishes nothing; previews for every other branch stay on.
Production only changes through the release workflow's `vercel deploy --prod`.

Vercel's free Hobby plan is for personal, non-commercial use only, and has a
single seat. If boutline is built for a client, Vercel's terms require Pro
($20 per member per month).

### Repository secrets

| Secret | Where it comes from |
| --- | --- |
| `DROPLET_SSH_KEY` | The droplet's CI deploy key (ask a Technical Chief) |
| `DROPLET_SSH_KNOWN_HOSTS` | `ssh-keyscan -t ed25519 <droplet-ip>` |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |

### Repository variables

| Variable | Example |
| --- | --- |
| `DROPLET_HOST` | `164.90.x.x` |
| `DROPLET_USER` | `deploy` |
| `API_DOMAIN` | `api.boutline.org` |
| `PREVIEW_DOMAIN` | `preview.generatenu.com` |
| `VERCEL_ORG_ID` | Vercel team or user ID |
| `VERCEL_PROJECT_ID` | Vercel → Settings → General |
| `PUBLIC_FRONTEND_URL` | `https://boutline.org` |

### Protect production

Settings → **Environments** → `production`, with the TLs as required
reviewers. The deploy job declares `environment: production`, so every release
waits for approval.

## Troubleshooting

**Stuck at "Wait for the backend to be healthy".** The new container is not
answering. Run `docker logs boutline-backend` on the droplet. The usual cause
is a wrong `DB_*` value in `/opt/boutline/backend.env`. The backend pings the
database at startup and exits if it cannot connect.

**Preview fails at "Bring the preview up".** The log shows which stage failed:
database creation, migrations, or the container start.

**`docker pull` fails with `denied` on the droplet.** The droplet's GHCR token
cannot read this repo's packages. See [deploy/README.md](deploy/README.md).

**A push to `main` published the frontend.** It should not, because
`frontend/vercel.json` disables Git deployments of `main`. Check that file is
intact and that the project's Root Directory is still `frontend`, or Vercel
will not find it.
