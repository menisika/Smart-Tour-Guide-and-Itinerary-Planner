CREATE SCHEMA IF NOT EXISTS planning;

CREATE TABLE IF NOT EXISTS planning.route (
  id uuid PRIMARY KEY,
  place_id uuid NOT NULL
);

ALTER TABLE planning.route ADD COLUMN IF NOT EXISTS note text;

INSERT INTO planning.route (id, place_id)
SELECT r.id, r.place_id FROM planning.route AS r WHERE false
ON CONFLICT DO NOTHING;
