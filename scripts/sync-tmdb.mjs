const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:8080';
const pages = Number(process.env.TMDB_SYNC_PAGES ?? 1);
const maxPages = Number(process.env.TMDB_SYNC_MAX_PAGES ?? 15);
const mode = process.env.TMDB_SYNC_MODE === 'refresh' ? 'refresh' : 'next';
const internalSyncToken = process.env.INTERNAL_SYNC_TOKEN;

if (!internalSyncToken) {
  throw new Error('INTERNAL_SYNC_TOKEN is required for the TMDB sync job');
}

if (!Number.isInteger(maxPages) || maxPages < 1) {
  throw new Error('TMDB_SYNC_MAX_PAGES must be a positive integer');
}

if (!Number.isInteger(pages) || pages < 1 || pages > maxPages) {
  throw new Error(
    `TMDB_SYNC_PAGES must be an integer between 1 and ${maxPages}`,
  );
}

const url = new URL('/movies/sync', apiBaseUrl);
url.searchParams.set('pages', String(pages));
url.searchParams.set('mode', mode);

const headers = {
  Authorization: `Bearer ${internalSyncToken}`,
  'x-internal-sync-token': internalSyncToken,
};
const response = await fetch(url, { method: 'POST', headers });
const body = await response.json().catch(() => ({}));

if (!response.ok) {
  if (
    response.status === 503 &&
    body.message === 'TMDB_API_KEY is not configured'
  ) {
    console.warn(
      'TMDB_API_KEY is not configured; skipping automatic TMDB sync.',
    );
    process.exit(0);
  }

  console.error(JSON.stringify(body, null, 2));
  throw new Error(`TMDB sync failed with HTTP ${response.status}`);
}

console.log(JSON.stringify(body, null, 2));
