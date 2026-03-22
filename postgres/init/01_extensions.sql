-- postgres/init/01_extensions.sql
-- Runs once when the container is first created.
-- Enable pg_trgm for fast ILIKE search (optional but useful for cleaner search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
