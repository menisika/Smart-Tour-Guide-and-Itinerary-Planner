-- Runs once, when the data volume is first created.
--
-- The PostGIS image enables its extensions in the default database. Our
-- database is created empty instead, as it is on the managed service of
-- ADR-0010, so that PostGIS comes from the first migration in both places.
CREATE DATABASE promenade OWNER promenade;
