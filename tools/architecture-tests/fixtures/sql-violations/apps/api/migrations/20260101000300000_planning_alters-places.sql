-- Deliberately wrong: a migration of planning alters a table of places.
ALTER TABLE places.place ADD COLUMN IF NOT EXISTS rank integer;
