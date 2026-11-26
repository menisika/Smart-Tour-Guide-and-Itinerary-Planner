CREATE SCHEMA IF NOT EXISTS places;

CREATE TABLE IF NOT EXISTS places.place (
  id uuid PRIMARY KEY,
  old_name text,
  name text NOT NULL,
  position geometry(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS place_name ON places.place (name);

COMMENT ON COLUMN places.place.old_name IS 'deprecated: replaced by name';
