-- Deliberately wrong: the mark and the removal are in the same migration.
COMMENT ON COLUMN places.place.position IS 'deprecated: moved to another table';
ALTER TABLE places.place DROP COLUMN IF EXISTS position;
