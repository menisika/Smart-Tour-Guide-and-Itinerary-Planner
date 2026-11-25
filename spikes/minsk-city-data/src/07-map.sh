#!/usr/bin/env bash
# Map extracts (ADR-0008): cuts PMTiles out of a Protomaps daily build with `pmtiles extract`
# and reports their sizes, with the sizes of the Latin and Cyrillic glyph ranges.
#
#   PROTOMAPS_BUILD  date of the daily build (YYYYMMDD). Builds are kept for about a week, so the
#                    build of the report (20261122) will be gone: set a current date to re-run.
#   MAX_CITY_MB      stop before downloading when the dry run predicts a larger city extract.
set -euo pipefail
cd "$(dirname "$0")/.."

PM=data/pmtiles-cli/pmtiles
BUILD="${PROTOMAPS_BUILD:-20261122}"
SRC="https://build.protomaps.com/${BUILD}.pmtiles"
MAX_CITY_MB="${MAX_CITY_MB:-300}"
OUT=data/map
mkdir -p "$OUT"

# CENTRE_BBOX (3 by 3 km around the centre) and CITY_BBOX (bounding box of the boundary).
eval "$(node src/07-map-bbox.ts)"
echo "build $BUILD; centre $CENTRE_BBOX; city $CITY_BBOX"

# 1. The centre, straight from the daily build.
[[ -s "$OUT/centre-3x3-z15.pmtiles" ]] || \
  "$PM" extract "$SRC" "$OUT/centre-3x3-z15.pmtiles" --bbox="$CENTRE_BBOX" --maxzoom=15

# 2. The whole city by its administrative boundary, straight from the daily build. Dry run first.
if [[ ! -s "$OUT/city-boundary-z15.pmtiles" ]]; then
  "$PM" extract "$SRC" "$OUT/city-boundary-z15.pmtiles" --region=out/minsk-boundary.geojson --maxzoom=15 --dry-run 2>&1 | tee "$OUT/city-dry-run.log"
  predicted="$(grep -o 'archive size of [0-9.]* [kMG]B' "$OUT/city-dry-run.log" | tail -1)"
  echo "dry run predicts: $predicted"
  mb="$(echo "$predicted" | awk '{v=$4; u=$5; if (u=="GB") v*=1000; if (u=="kB") v/=1000; printf "%d", v}')"
  if (( mb > MAX_CITY_MB )); then
    echo "predicted $mb MB exceeds MAX_CITY_MB=$MAX_CITY_MB; not downloading" >&2
    exit 2
  fi
  "$PM" extract "$SRC" "$OUT/city-boundary-z15.pmtiles" --region=out/minsk-boundary.geojson --maxzoom=15
fi

# 3. The same by the bounding box of the boundary. Minsk has two exclaves to the east (the
#    airport among them), so the box is much wider than the city.
[[ -s "$OUT/city-bbox-z15.pmtiles" ]] || \
  "$PM" extract "$SRC" "$OUT/city-bbox-z15.pmtiles" --bbox="$CITY_BBOX" --maxzoom=15

# 4. Everything else is cut locally, with no further download: lower maximum zooms, and the
#    centre again from the city archive, to confirm that a local cut equals a cut from the build.
for z in 14 13 12 11 10; do
  "$PM" extract "$OUT/city-boundary-z15.pmtiles" "$OUT/city-boundary-z$z.pmtiles" --maxzoom="$z" --quiet
done
"$PM" extract "$OUT/city-bbox-z15.pmtiles" "$OUT/centre-3x3-z15-local.pmtiles" --bbox="$CENTRE_BBOX" --maxzoom=15 --quiet
for z in 14 13; do
  "$PM" extract "$OUT/centre-3x3-z15.pmtiles" "$OUT/centre-3x3-z$z.pmtiles" --maxzoom="$z" --quiet
done
# The area of the reference Outing, when 08-material.ts has chosen it.
if [[ -s out/08-outing-bbox.txt ]]; then
  "$PM" extract "$OUT/city-bbox-z15.pmtiles" "$OUT/outing-z15.pmtiles" --bbox="$(cat out/08-outing-bbox.txt)" --maxzoom=15 --quiet
fi

"$PM" show "$OUT/city-boundary-z15.pmtiles" > "$OUT/city-boundary-z15.show.txt"
"$PM" show "$OUT/centre-3x3-z15.pmtiles" > "$OUT/centre-3x3-z15.show.txt"

node src/07-map-report.ts "$BUILD"
