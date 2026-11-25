// Shared constants and helpers of the spike. Erasable TypeScript only: Node runs these files directly.
import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const OSM_DATE = process.env.OSM_DATE ?? '261122';
export const PBF = `data/osm/belarus-${OSM_DATE}.osm.pbf`;
export const DB_FILE = 'out/minsk.duckdb';

/** Wikidata item of the city whose administrative boundary is cut. A city is data: change it here. */
export const CITY_WIKIDATA = 'Q2280';
export const CITY_TZ = 'Europe/Minsk';
export const CITY_COUNTRY = 'by';

/**
 * Centre used for "the centre, 1.5 km radius" and for the 3 by 3 km map cut: the `place=city`
 * node of Minsk in OpenStreetMap (node 26162465), which stands on Kastryčnickaja Square.
 */
export const CENTRE = { lat: 53.90247, lon: 27.56182 };
export const CENTRE_RADIUS_M = 1500;

/** Minsk railway station, start and finish of scenario SC-1: centre of the station building (way 358224860). */
export const STATION = { lat: 53.89056, lon: 27.55118 };

export const USER_AGENT = 'minsk-city-data-spike/0.1';

export async function openDb(opts: { readOnly?: boolean } = {}): Promise<DuckDBConnection> {
  mkdirSync(dirname(DB_FILE), { recursive: true });
  const instance = await DuckDBInstance.create(DB_FILE, {
    threads: '8',
    memory_limit: '12GB',
    // Keep the downloaded extension inside the spike folder instead of ~/.duckdb.
    extension_directory: 'data/duckdb-ext',
    ...(opts.readOnly ? { access_mode: 'READ_ONLY' } : {}),
  });
  const con = await instance.connect();
  await con.run('INSTALL spatial; LOAD spatial;');
  // Longitude first, latitude second, everywhere. DuckDB 2.0 demands an explicit choice.
  await con.run('SET geometry_always_xy = true;');
  return con;
}

/** Rows as plain JSON objects (BIGINT comes back as a string: cast in SQL when a number is wanted). */
export async function rows<T = Record<string, unknown>>(con: DuckDBConnection, sql: string): Promise<T[]> {
  const reader = await con.runAndReadAll(sql);
  return reader.getRowObjectsJson() as T[];
}

export async function scalar<T = unknown>(con: DuckDBConnection, sql: string): Promise<T> {
  const reader = await con.runAndReadAll(sql);
  return reader.getRowsJson()[0]?.[0] as T;
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

export function timer(): () => number {
  const t0 = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - t0) / 1e6;
}

export function pct(part: number, whole: number): string {
  return whole === 0 ? '—' : `${((100 * part) / whole).toFixed(1)} %`;
}

/** Great-circle distance in metres. Used for measuring only; nothing here is shared planner code. */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371008.8;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function mdTable(header: string[], body: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
  return [line(header), line(header.map(() => '---')), ...body.map(line)].join('\n');
}
