-- Deliberately wrong: a foreign key into another module's schema.
CREATE TABLE IF NOT EXISTS planning.stop (
  id uuid PRIMARY KEY,
  place_id uuid REFERENCES places.place (id)
);
