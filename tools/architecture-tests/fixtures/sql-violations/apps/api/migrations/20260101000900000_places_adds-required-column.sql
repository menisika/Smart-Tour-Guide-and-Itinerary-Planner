-- Deliberately wrong: the image that is still running cannot insert any more.
ALTER TABLE places.place ADD COLUMN IF NOT EXISTS kind text NOT NULL;
