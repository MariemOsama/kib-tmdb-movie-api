CREATE TABLE IF NOT EXISTS movies (
  id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  original_title TEXT,
  overview TEXT NOT NULL DEFAULT '',
  release_date DATE,
  poster_path TEXT,
  backdrop_path TEXT,
  original_language TEXT,
  status TEXT,
  runtime_minutes INTEGER,
  budget BIGINT,
  revenue BIGINT,
  tagline TEXT,
  homepage TEXT,
  imdb_id TEXT,
  popularity NUMERIC(12, 4) NOT NULL DEFAULT 0,
  tmdb_rating_average NUMERIC(4, 2) NOT NULL DEFAULT 0,
  tmdb_rating_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE IF NOT EXISTS sync_state (
  source TEXT PRIMARY KEY,
  next_page INTEGER NOT NULL DEFAULT 1,
  refresh_next_page INTEGER NOT NULL DEFAULT 1,
  total_pages INTEGER,
  last_start_page INTEGER,
  last_page_count INTEGER,
  last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sync_state
  ADD COLUMN IF NOT EXISTS refresh_next_page INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_watchlist (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_id)
);

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_movies_title ON movies USING btree (title);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies (release_date);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_id ON movie_genres (genre_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_created_at ON user_watchlist (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created_at ON user_favorites (user_id, created_at DESC);
