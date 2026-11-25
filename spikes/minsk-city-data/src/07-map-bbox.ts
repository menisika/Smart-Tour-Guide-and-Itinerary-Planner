// Prints shell assignments with the two bounding boxes the map step cuts.
import { readFileSync } from 'node:fs';
import { CENTRE } from './lib.ts';

const HALF_SIDE_M = 1500;
const dLat = HALF_SIDE_M / 111_320;
const dLon = HALF_SIDE_M / (111_320 * Math.cos((CENTRE.lat * Math.PI) / 180));
const f = (x: number) => x.toFixed(5);
const centre = [CENTRE.lon - dLon, CENTRE.lat - dLat, CENTRE.lon + dLon, CENTRE.lat + dLat].map(f).join(',');
const extract = JSON.parse(readFileSync('out/01-extract.json', 'utf8')) as { city_bbox: number[] };
console.log(`CENTRE_BBOX=${centre}`);
console.log(`CITY_BBOX=${extract.city_bbox.map(f).join(',')}`);
