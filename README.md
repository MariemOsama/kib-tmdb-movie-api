# KIB TMDB Movie API

NestJS API for the KIB TMDB movie challenge. The service stores TMDB movie catalog data in PostgreSQL, uses Redis for read-through caching, exposes Swagger documentation, and secures the movie APIs with register/login bearer authentication.

## What Is Included

- NestJS API running on port `8080`
- PostgreSQL schema for movies, genres, movie-genre links, sync state, users, lists, and ratings
- Redis read-through caching for movie listing, movie details, genres, watchlist, and favorites
- Swagger UI at `/docs`
- Auth endpoints for register and login
- Bearer-token protection for movie endpoints
- Internal sync token for the Docker TMDB sync job
- TMDB popular movies sync with `next` and `refresh` modes
- Unit tests for auth, security, movie sync, repository mapping, movie ratings, user lists, cache behavior, performance-oriented cache coalescing, health, and root endpoint

## Architecture

The API is split by responsibility:

- Controllers own HTTP contracts, Swagger descriptions, auth guards, and query parsing.
- Services own business rules such as sync modes, rating validation, cache invalidation, and pagination wrappers.
- Repositories own PostgreSQL SQL and result mapping.
- PostgreSQL is the source of truth for movies, genres, users, lists, ratings, and sync cursors.
- Redis is a read-through cache for hot read paths. The cache is treated as optional infrastructure: if Redis is unavailable, requests fall back to PostgreSQL.

Movie listing, watchlist, and favorites share the same search/filter/pagination builder so behavior stays consistent across public catalog and user-specific lists. Pagination uses a `limit + 1` fetch to produce `hasMore` without adding a separate count query to every hot listing request.

Cache keys include a global movie version and, for user-specific responses, a per-user version. Syncing movies or rating a movie invalidates catalog-level responses. Changing watchlist, favorites, or a user's rating invalidates that user's cached responses.

## Run With Docker

```bash
docker compose up --build
```

The API runs at:

```text
http://localhost:8080
```

Swagger UI:

```text
http://localhost:8080/docs
```

Docker Compose starts PostgreSQL, Redis, the API, and a one-shot `tmdb-sync` service. The sync service waits until the API is healthy, then calls `POST /movies/sync` with the internal sync token and syncs `15` TMDB popular pages by default.

## How To Review

Start the full stack:

```bash
docker compose up --build
```

Open Swagger:

```text
http://localhost:8080/docs
```

Suggested API flow:

1. Register a user with `POST /auth/register`.
2. Click Swagger `Authorize` and paste the returned `accessToken`.
3. Check the synced catalog with `GET /movies`.
4. Add a movie to `POST /user/watchlist/{movieId}` or `POST /user/favorites/{movieId}`.
5. Verify user-specific flags through `GET /movies`, `GET /user/watchlist`, and `GET /user/favorites`.
6. Rate a movie with `POST /movies/{movieId}/rating` and confirm `userRatingAverage`, `userRatingCount`, and `myRating`.

Run quality checks:

```bash
npm run lint
npm run build
npm test
npm run test:e2e
npm run test:perf
npm run test:cov
```

## Environment

For local development, create `.env` in the project root when running outside Docker:

```env
PORT=8080
DATABASE_URL=postgresql://kib_user:kib_password@localhost:5432/kib_movies
REDIS_URL=redis://localhost:6379
TMDB_API_KEY='your_real_tmdb_key'
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_SYNC_MAX_PAGES=15
JWT_SECRET='replace_with_a_long_random_secret'
INTERNAL_SYNC_TOKEN='replace_with_a_long_random_internal_token'
```

## Auth Flow

Register:

```http
POST /auth/register
Content-Type: application/json

{
  "email": "mariem@example.com",
  "password": "strong-password"
}
```

Login:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "mariem@example.com",
  "password": "strong-password"
}
```

Both endpoints return an `accessToken`. Use it for secured APIs:

```http
Authorization: Bearer <accessToken>
```

Login error behavior:

- `400` when the email format is invalid.
- `404` when the user does not exist.
- `401` when the password is wrong.

## API Endpoints

Public endpoints:

- `GET /` returns a welcome payload with useful links.
- `GET /docs` opens Swagger UI.
- `GET /health` returns liveness status.
- `GET /ready` checks PostgreSQL and Redis connectivity.
- `POST /auth/register` creates a user and returns a bearer token.
- `POST /auth/login` verifies credentials and returns a bearer token.

Secured endpoints:

- `GET /movies?search=obsession&filter=all&year=2026&genreId=27&limit=20&offset=0` lists movies stored in PostgreSQL with optional title search, enum filters, year, genre, pagination, `isFavorite`, `isInWatchlist`, `myRating`, `userRatingAverage`, and `userRatingCount` for the current user.
- `GET /movies/:movieId` returns one synced movie with the same user flags and app-user rating summary.
- `POST /movies/:movieId/rating` adds or updates the current user's rating from `1` to `10`.
- `GET /movies/genres` lists synced TMDB genres.
- `POST /movies/sync?pages=15&mode=next` syncs TMDB popular movies and genres.
- `GET /user/watchlist?search=obsession&filter=all&year=2026&genreId=27&limit=20&offset=0` lists the current user's watchlist with the same search, enum filters, year, genre, and pagination as `GET /movies`.
- `POST /user/watchlist/:movieId` adds a catalog movie to the current user's watchlist.
- `DELETE /user/watchlist/:movieId` removes a movie from the current user's watchlist.
- `GET /user/favorites?search=obsession&filter=all&year=2026&genreId=27&limit=20&offset=0` lists the current user's favorites with the same search, enum filters, year, genre, and pagination as `GET /movies`.
- `POST /user/favorites/:movieId` adds a catalog movie to the current user's favorites.
- `DELETE /user/favorites/:movieId` removes a movie from the current user's favorites.

`POST /movies/sync` can be called with either:

- `Authorization: Bearer <accessToken>` for normal API clients.
- `x-internal-sync-token: <INTERNAL_SYNC_TOKEN>` for the Docker sync job.

User list examples:

```http
GET /user/watchlist
Authorization: Bearer <accessToken>
```

```http
POST /user/watchlist/123
Authorization: Bearer <accessToken>
```

```http
DELETE /user/favorites/123
Authorization: Bearer <accessToken>
```

Watchlist and favorites are separate lists. Add and remove operations are idempotent: adding an existing movie returns `added=false`, and removing a missing movie returns `removed=false`.

List endpoints return a consistent wrapper:

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "count": 0,
    "hasMore": false
  }
}
```

User list endpoints keep the same wrapper and add the list name:

```json
{
  "list": "watchlist",
  "data": [],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "count": 0,
    "hasMore": false
  }
}
```

Movie responses include imported TMDB ratings and separate app-user ratings. `tmdbRatingAverage` and `tmdbRatingCount` come from TMDB sync. `userRatingAverage`, `userRatingCount`, and `myRating` come from users of this API:

```json
{
  "id": 123,
  "title": "Example Movie",
  "tmdbRatingAverage": 7.8,
  "tmdbRatingCount": 120,
  "userRatingAverage": 8.25,
  "userRatingCount": 4,
  "myRating": 9,
  "isFavorite": true,
  "isInWatchlist": false
}
```

Search and filter movies:

```http
GET /movies?search=obsession&filter=released&year=2026&genreId=27&limit=20&offset=0
Authorization: Bearer <accessToken>
```

Search matches movie `title` and `originalTitle` case-insensitively. `year` filters by release year, and `genreId` filters by TMDB genre id from `GET /movies/genres`. The same query parameters also work on `GET /user/watchlist` and `GET /user/favorites`.

Supported `filter` values:

- `all`: no filter.
- `released`: release date is today or in the past.
- `upcoming`: release date is in the future.
- `highly_rated`: TMDB average rating is at least `7`.
- `rated_by_me`: movies rated by the current user.

`limit` defaults to `20` and is capped at `100` to keep the API predictable as the local catalog grows. `offset` defaults to `0`. `count` is the number of returned items in the current response, and `hasMore` tells the client whether another page is available.

Rate a movie:

```http
POST /movies/123/rating
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "rating": 9
}
```

## Sync Modes

`next`:

Syncs the next N TMDB popular pages from the stored cursor and advances the cursor. `pages` is clamped between `1` and `15`.

`refresh`:

Re-syncs previously synced pages in bounded batches using a separate refresh cursor. It does not move beyond the existing synced range and does not change the main ingest cursor. For example, if the ingest cursor is `31` and the refresh cursor is `1`, refresh with `pages=15` re-syncs pages `1..15`; the next refresh call re-syncs `16..30`.

The batch size is controlled by `TMDB_SYNC_MAX_PAGES`, defaults to `15`, and has an application safety cap of `100`. This protects the API from huge refresh requests, long-running HTTP calls, memory spikes, and TMDB rate-limit pressure. If the catalog eventually has 10K synced pages, the best practice is to refresh them incrementally through repeated bounded jobs, not one giant request.

Run manual sync against a local API:

```bash
TMDB_SYNC_PAGES=3 npm run sync:tmdb
```

Refresh already synced data:

```bash
TMDB_SYNC_MODE=refresh npm run sync:tmdb
```

## Database Notes

Schema bootstrap SQL lives in:

```text
docker/postgres/init
```

Postgres init scripts run only when the Docker volume is first created. If you already created the volume before a new table was added, either run a manual migration or reset the local volume:

```bash
docker compose down -v
docker compose up --build
```

Use `down -v` only when you are okay deleting the local database volume.

Migration notes for this challenge:

- `docker/postgres/init/001_schema.sql` is the current baseline migration for a fresh local database.
- For a new local database, `docker compose up` creates the schema automatically from that baseline.
- For an existing local database, apply schema changes manually with `psql`, DBeaver, or reset the local Docker volume if data loss is acceptable.
- In a production version, add a migration runner such as `node-pg-migrate` and run migrations before the API starts. Keep each schema change in a numbered, repeatable migration file instead of editing the baseline only.
- Data sync from TMDB is intentionally not a schema migration. Schema migrations create tables and columns; the sync job imports external catalog data into those tables.

## Caching

Redis is used as a read-through cache for read-heavy endpoints:

- `GET /movies`
- `GET /movies/:movieId`
- `GET /movies/genres`
- `GET /user/watchlist`
- `GET /user/favorites`

Cache keys include a global movie version and, when the response is user-specific, a per-user version. Syncing movies or changing ratings bumps the global movie version. Adding/removing watchlist or favorites and changing a user's rating bumps that user's version. This avoids broad Redis key scans while keeping stale data short-lived.

Movie and user-list caches use a short TTL of `60` seconds; genres use `300` seconds. The app fails open if Redis is unavailable, so the API falls back to PostgreSQL instead of failing requests.

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

Run coverage:

```bash
npm run test:cov
```

Run e2e tests:

```bash
npm run test:e2e
```

Run performance-oriented cache tests:

```bash
npm run test:perf
```

Run lint and build:

```bash
npm run lint
npm run build
```