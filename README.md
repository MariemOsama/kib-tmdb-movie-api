# KIB TMDB Movie API

This repository will implement the KIB TMDB movie API challenge step by step.

The initial version only bootstraps the runtime foundation:

- NestJS API service
- PostgreSQL database service
- Redis cache service
- Docker Compose orchestration
- Environment configuration
- Swagger documentation
- Friendly root endpoint
- Liveness and readiness endpoints
- PostgreSQL schema
- Basic movie listing and TMDB popular-movie sync

Auth, ratings, watchlist, favorites, Redis caching behavior, API docs expansion, and performance tests will be added in later commits.

## Run

```bash
docker-compose up --build
```

The API runs on:

```bash
http://localhost:8080
```

## Endpoints

```http
GET /
```

Returns a small welcome payload with useful links.

```http
GET /docs
```

Opens Swagger UI.

```http
GET /health
```

Returns:

```json
{ "status": "ok" }
```

```http
GET /ready
```

Checks PostgreSQL and Redis connectivity.

```http
GET /movies
```

Lists movies stored in PostgreSQL. Movie and genre data is populated from TMDB during sync.

```text
docker/postgres/init
```

Design note:

- `GET /movies` will represent the public TMDB movie catalog.
- `GET /me/watchlist` and `GET /me/favorites` will later represent the logged-in user's saved movie lists.
- `POST /movies/:movieId/watchlist` and `POST /movies/:movieId/favorite` will later add catalog movies to the current user's lists.
- Auth will be added with `POST /auth/register`, `POST /auth/login`.

```http
POST /movies/sync?pages=1
```

Syncs popular movies and movie genres from TMDB into PostgreSQL.

```env
TMDB_API_KEY='your_real_key'
```

With Docker:

```bash
docker compose up --build -d
```

`docker compose up` also starts a one-shot `tmdb-sync` service after the API is healthy. It syncs 15 popular TMDB pages automatically when `TMDB_API_KEY` is configured. If no key is configured, the sync job exits cleanly and the database remains empty until a sync is run.

Sync modes:

- `next`: sync from the next unprocessed TMDB popular page and advance the cursor.
- `refresh`: re-sync the last pulled batch of pages to update already stored data.

To sync more than one TMDB popular page:

```bash
TMDB_SYNC_PAGES=3 npm run sync:tmdb
```

To refresh the last synced batch instead of advancing:

```bash
TMDB_SYNC_MODE=refresh npm run sync:tmdb
```

This is data ingestion, not a schema migration. Schema bootstrap SQL lives in `docker/postgres/init`; real movie and genre catalog data comes from TMDB through `POST /movies/sync`.

In Docker Compose, init scripts run only when the Postgres volume is first created. To reset the database and rerun seed scripts:

```bash
docker compose down -v
docker compose up --build
```

## Local Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run start:dev
```

Run tests:

```bash
npm test
```

## Initial Commit Scope

This step intentionally includes the foundation plus database schema and the first scalable TMDB sync path. Remaining business features will come in separate branches/commits.
