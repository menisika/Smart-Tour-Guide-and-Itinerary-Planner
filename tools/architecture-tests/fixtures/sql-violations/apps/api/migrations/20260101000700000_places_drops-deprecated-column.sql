-- Right: an earlier migration marked the column as deprecated.
ALTER TABLE places.place DROP COLUMN IF EXISTS old_name;
