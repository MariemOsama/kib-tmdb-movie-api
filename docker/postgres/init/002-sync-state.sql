INSERT INTO sync_state (source, next_page, total_pages, last_start_page, last_page_count)
VALUES ('tmdb_popular_movies', 1, NULL, NULL, NULL)
ON CONFLICT (source) DO NOTHING;
