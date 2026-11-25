-- Enables PostGIS, on which the places of the product rest (ADR-0010, point 1).
--
-- Migrations are forward-only (ADR-0026): this file has no "down" part, and a
-- later release never edits it. To undo something, write a new migration.
CREATE EXTENSION IF NOT EXISTS postgis;
