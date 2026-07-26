# Installation & Local Setup

This guide takes a new developer from a clean machine to a fully running
instance of the HRIS platform — backend API, frontend app, database, and
cache/queue.

## Project structure

```
hris-platform/
├── backend/     Django + DRF API, Celery workers (see backend/README.md*)
├── frontend/    React + TypeScript app (Vite) (see frontend/README.md*)
└── docker-compose.yml   Postgres + Redis for local dev
```
\* backend/frontend READMEs are placeholders for now; this file is the source of truth.

## 1. Prerequisites

Install these first. Skip anything you already have — check with the
"Verify" command before reinstalling.

### Git
- Windows: https://git-scm.com/download/win
- macOS: `brew install git` (or install Xcode Command Line Tools)
- Linux: `sudo apt install git` / `sudo dnf install git`
- Verify: `git --version`

### Docker Desktop (runs Postgres + Redis)
- Windows/macOS: https://www.docker.com/products/docker-desktop/
- Linux: install [Docker Engine](https://docs.docker.com/engine/install/) + the [Compose plugin](https://docs.docker.com/compose/install/linux/)
- Verify: `docker --version` and `docker compose version`
- Windows/macOS: launch the Docker Desktop app once and wait for it to say "running" before continuing.

### Python 3.13
- Windows: https://www.python.org/downloads/ (check "Add python.exe to PATH" during install)
- macOS: `brew install python@3.13`
- Linux: `sudo apt install python3.13 python3.13-venv`
- Verify: `python --version` (or `python3 --version` on macOS/Linux)

### uv (Python package/dependency manager used by the backend)
- Windows (PowerShell): `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
- macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Verify: `uv --version`
- Docs: https://docs.astral.sh/uv/getting-started/installation/

### Node.js 22+ (frontend)
- Any OS: install via [nvm](https://github.com/nvm-sh/nvm) (`nvm install 22`) or download from https://nodejs.org/
- Verify: `node --version` and `npm --version`

## 2. Clone the repository

```bash
git clone https://github.com/Silversatility/hris-platform.git
cd hris-platform
```

## 3. Configure environment variables

Both apps read config from `.env` files that are git-ignored (never commit
real secrets). Copy the example files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Open `backend/.env` and replace `DJANGO_SECRET_KEY` with a real random
value (the example value is a placeholder, not safe to use):

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Paste the output as `DJANGO_SECRET_KEY=...` in `backend/.env`.

| File | Variable | Purpose | Default (from `.env.example`) |
|---|---|---|---|
| `backend/.env` | `DJANGO_SECRET_KEY` | Django cryptographic signing key | *(must be set manually)* |
| | `DJANGO_DEBUG` | Verbose errors, disable in real deployments | `True` |
| | `DJANGO_ALLOWED_HOSTS` | Hosts Django will serve | `localhost,127.0.0.1` |
| | `DATABASE_URL` | Postgres connection string | `postgres://hris:hris@localhost:5433/hris` |
| | `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` | Redis connection for async tasks | `redis://localhost:6379/0` |
| | `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API | `http://localhost:5173` |
| `frontend/.env` | `VITE_API_URL` | Backend base URL the frontend calls | `http://localhost:8000` |

The defaults above already match the Docker services in step 4, so unless
you're changing ports, only the secret key needs editing.

## 4. Start Postgres + Redis (Docker)

```bash
docker compose up -d
```

This starts, on first run, by pulling images and creating a persistent
volume for Postgres data:
- `db` — Postgres 17 with the `pgvector` extension available (needed later for the AI/embeddings layer), on `localhost:5433` (not the default 5432 — kept clear of any native Postgres install already on your machine), credentials `hris`/`hris`
- `redis` — Redis 7, on `localhost:6379`

Check both came up healthy:

```bash
docker compose ps
```

You should see `healthy` next to both `db` and `redis`. If not, check logs
with `docker compose logs db` / `docker compose logs redis`.

## 5. Backend setup

```bash
cd backend
uv sync                              # installs Python deps into backend/.venv
uv run python manage.py migrate      # creates database tables
uv run python manage.py createsuperuser   # optional: admin login for /admin/
uv run python manage.py runserver 8000
```

Leave this terminal running. Verify the backend is up:
- Health check: http://localhost:8000/api/health/ → `{"status": "ok"}`
- API docs (Swagger UI): http://localhost:8000/api/docs/
- Admin panel: http://localhost:8000/admin/ (login with the superuser you just created)

## 6. Frontend setup

Open a **second terminal** (leave the backend running in the first):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the page should show the backend API status
as "connected". If it says "unreachable", confirm the backend is still
running on port 8000 and that `frontend/.env`'s `VITE_API_URL` matches.

## 7. Celery worker (optional for now)

Not required until background/scheduled jobs exist (payroll runs, ticket
SLA checks, etc.), but to start one, open a **third terminal**:

```bash
cd backend
uv run celery -A config worker -l info
```

## Running tests and linters

```bash
# Backend
cd backend
uv run ruff check .
uv run pytest

# Frontend
cd frontend
npm run lint
npm run build
```

These are the same checks CI runs on every push (`.github/workflows/ci.yml`).

## Everyday workflow (after initial setup)

Once set up, day-to-day you only need:

```bash
docker compose up -d                                    # if not already running
cd backend && uv run python manage.py runserver 8000     # terminal 1
cd frontend && npm run dev                               # terminal 2
```

## Stopping everything

```bash
# Ctrl+C the backend, frontend, and celery terminals, then:
docker compose down          # stop Postgres + Redis, keep data
docker compose down -v       # also wipe the Postgres volume (fresh DB next time)
```

## Troubleshooting

- **`docker compose up` fails to connect to the Docker daemon** — Docker
  Desktop isn't running; open the app and wait for it to fully start.
- **Port already in use (5433, 6379, 8000, or 5173)** — something else on
  your machine is using that port. Stop it, or change the port mapping in
  `docker-compose.yml` / the `runserver`/`vite` command (and update
  `DATABASE_URL` to match if you change the Postgres port).
- **`password authentication failed for user "hris"`** — usually means
  something other than this project's container is answering on that
  port (commonly a native Postgres install already running on the host).
  Check with `netstat -ano | findstr :5433` (Windows) — if another
  process owns it, either stop that service or remap the port again.
- **`DJANGO_SECRET_KEY` error on startup** — `backend/.env` wasn't created,
  or the variable is missing/empty. Re-check step 3.
- **Frontend shows "unreachable"** — the backend isn't running, or
  `CORS_ALLOWED_ORIGINS` in `backend/.env` doesn't include the frontend's
  origin (`http://localhost:5173` by default).
- **`uv: command not found` after installing** — restart your terminal so
  the updated PATH takes effect.
