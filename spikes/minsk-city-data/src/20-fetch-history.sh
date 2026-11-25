#!/usr/bin/env bash
# Downloads what the change-rate measurement needs: an older extract of Belarus as the starting
# state, and Geofabrik's daily diffs from the day after it up to the newest one wanted.
# One request at a time, a pause between requests; re-running skips what is already present.
#
#   BASE_DATE   the older extract, YYMMDD (the report uses 261001; Geofabrik keeps the first of a
#               month for a few months, then only 1 January of each year)
#   FIRST_DIFF, LAST_DIFF   sequence numbers of the daily diffs (the report uses 4926..4977:
#               2 October to 23 November 2026)
set -euo pipefail
cd "$(dirname "$0")/.."

UA='minsk-city-data-spike/0.1'
BASE_DATE="${BASE_DATE:-261001}"
FIRST_DIFF="${FIRST_DIFF:-4926}"
LAST_DIFF="${LAST_DIFF:-4977}"
ROOT='https://download.geofabrik.de/europe/belarus'

mkdir -p data/osm-base data/osm-diffs
PBF="data/osm-base/belarus-${BASE_DATE}.osm.pbf"
if [[ ! -s "$PBF" ]]; then
  curl -fL --retry 3 -A "$UA" -o "$PBF.part" "$ROOT/belarus-${BASE_DATE}.osm.pbf"
  curl -fsSL -A "$UA" -o "$PBF.md5" "$ROOT/belarus-${BASE_DATE}.osm.pbf.md5"
  want="$(cut -d' ' -f1 "$PBF.md5")"
  got="$(md5sum "$PBF.part" | cut -d' ' -f1)"
  [[ "$want" == "$got" ]] || { echo "md5 mismatch for $PBF: $got != $want" >&2; exit 1; }
  mv "$PBF.part" "$PBF"
fi
ls -l "$PBF"

for seq in $(seq "$FIRST_DIFF" "$LAST_DIFF"); do
  padded="$(printf '%09d' "$seq")"
  dir="${padded:0:3}/${padded:3:3}"
  name="${padded:6:3}"
  for ext in osc.gz state.txt; do
    out="data/osm-diffs/${seq}.${ext}"
    [[ -s "$out" ]] && continue
    curl -fsSL --retry 3 -A "$UA" -o "$out.part" "$ROOT/updates/$dir/$name.$ext"
    mv "$out.part" "$out"
    sleep 1.1
  done
done
ls data/osm-diffs/*.osc.gz | wc -l
du -sh data/osm-diffs
