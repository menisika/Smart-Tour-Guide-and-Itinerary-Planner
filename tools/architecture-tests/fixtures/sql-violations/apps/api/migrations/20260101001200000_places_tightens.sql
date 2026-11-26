-- Deliberately wrong: tightening a table that is in use.
ALTER TABLE places.place ALTER COLUMN old_name SET NOT NULL;
