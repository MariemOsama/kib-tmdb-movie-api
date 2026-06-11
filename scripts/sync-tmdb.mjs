const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:8080';
const pages = Number(process.env.TMDB_SYNC_PAGES ?? 1);
const mode = process.env.TMDB_SYNC_MODE === 'refresh' ? 'refresh' : 'next';

if (!Number.isInteger(pages) || pages < 1 || pages > 15) {
  throw new Error('TMDB_SYNC_PAGES must be an integer between 1 and 15');
}

const url = new URL('/movies/sync', apiBaseUrl);
url.searchParams.set('pages', String(pages));
url.searchParams.set('mode', mode);

const response = await fetch(url, { method: 'POST' });
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
