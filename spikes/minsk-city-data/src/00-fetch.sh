#!/usr/bin/env bash
# Downloads the inputs of the spike. Every file goes into its own directory under data/.
# Nothing here needs an account. Re-running skips what is already present.
#
#   OSM_DATE   Geofabrik keeps dated extracts for a few weeks; pin another date here when
#              belarus-261122 is gone (YYMMDD). The numbers in the report are for 261122.
set -euo pipefail
cd "$(dirname "$0")/.."

UA='minsk-city-data-spike/0.1'
OSM_DATE="${OSM_DATE:-261122}"
PMTILES_VERSION="${PMTILES_VERSION:-1.31.2}"

# 1. OpenStreetMap extract of Belarus (about 353 MB).
PBF="data/osm/belarus-${OSM_DATE}.osm.pbf"
if [[ ! -s "$PBF" ]]; then
  curl -fL --retry 3 -A "$UA" -o "$PBF.part" \
    "https://download.geofabrik.de/europe/belarus-${OSM_DATE}.osm.pbf"
  curl -fsSL -A "$UA" -o "$PBF.md5" \
    "https://download.geofabrik.de/europe/belarus-${OSM_DATE}.osm.pbf.md5"
  want="$(cut -d' ' -f1 "$PBF.md5")"
  got="$(md5sum "$PBF.part" | cut -d' ' -f1)"
  [[ "$want" == "$got" ]] || { echo "md5 mismatch for $PBF: $got != $want" >&2; exit 1; }
  mv "$PBF.part" "$PBF"
fi
ls -l "$PBF"

# 2. pmtiles command-line tool, official release (about 17 MB). The release publishes no
#    checksum file, so the archive is compared with the SHA-256 seen on first download
#    (23 November 2026). Another version needs its own value in PMTILES_SHA256.
PMTILES_SHA256="${PMTILES_SHA256:-3ed7dbf4ec2e6dfe5e25b6f70d1ffc932729f93c86db353bf514dd71010a312f}"
if [[ ! -x data/pmtiles-cli/pmtiles ]]; then
  tgz="go-pmtiles_${PMTILES_VERSION}_Linux_x86_64.tar.gz"
  curl -fL --retry 3 -A "$UA" -o "data/pmtiles-cli/$tgz" \
    "https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/$tgz"
  echo "$PMTILES_SHA256  data/pmtiles-cli/$tgz" | sha256sum -c -
  tar -xzf "data/pmtiles-cli/$tgz" -C data/pmtiles-cli pmtiles
fi
data/pmtiles-cli/pmtiles version

# 3. Glyph ranges of the fonts the Protomaps styles use (about 0.1 MB each).
#    Latin: 0-255, 256-511 (Latin Extended-A/B: needed for Belarusian Latin and Polish),
#    Cyrillic: 1024-1279, 1280-1535; 8192-8447 is general punctuation (dashes, quotes).
for font in "Noto Sans Regular" "Noto Sans Medium" "Noto Sans Italic"; do
  mkdir -p "data/glyphs/$font"
  for range in 0-255 256-511 1024-1279 1280-1535 8192-8447; do
    out="data/glyphs/$font/$range.pbf"
    [[ -s "$out" ]] && continue
    curl -fsSL --retry 3 -A "$UA" -o "$out" \
      "https://raw.githubusercontent.com/protomaps/basemaps-assets/main/fonts/${font// /%20}/$range.pbf"
  done
done
du -sh data/glyphs
