#!/usr/bin/env bash
# Builds the phone's JavaScript engine as a command-line binary.
#
#     tools/engine-parity/scripts/build-hermes.sh <output directory>
#
# The engine is Hermes at the version the pinned React Native ships, named in
# ../hermes.json. No binary of the virtual machine is published for it — the
# releases on GitHub stop at v0.13.0, and the npm package `hermes-compiler`
# holds the compiler only, which refuses to execute a script — so it is built
# from the pinned commit. The commit and the tree it points at are both checked
# after the download: Git names them by the hash of their content.
#
# Internationalisation is left out of the build: on a phone it comes from the
# platform, not from Hermes, and the planner may not depend on it anyway. This
# also keeps the build free of system libraries.
#
# Needs git, cmake, a C++ compiler and node.
set -euo pipefail

out="${1:?Usage: build-hermes.sh <output directory>}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pin="$here/../hermes.json"
read_pin() { node -p "require('$pin').$1"; }

repository="$(read_pin repository)"
commit="$(read_pin commit)"
tree="$(read_pin tree)"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git init --quiet "$work/src"
git -C "$work/src" remote add origin "$repository"
git -C "$work/src" fetch --quiet --depth 1 origin "$commit"
git -C "$work/src" checkout --quiet FETCH_HEAD

got_commit="$(git -C "$work/src" rev-parse HEAD)"
got_tree="$(git -C "$work/src" rev-parse 'HEAD^{tree}')"
if [ "$got_commit" != "$commit" ] || [ "$got_tree" != "$tree" ]; then
  echo "The sources are not the pinned ones: commit $got_commit, tree $got_tree." >&2
  exit 1
fi

cmake -S "$work/src" -B "$work/build" \
  -DCMAKE_BUILD_TYPE=Release \
  -DHERMES_ENABLE_INTL=OFF \
  -DHERMES_UNICODE_LITE=ON >/dev/null
cmake --build "$work/build" --target hermes --parallel "$(nproc)" >"$work/build.log" 2>&1 || {
  tail -n 50 "$work/build.log" >&2
  exit 1
}

mkdir -p "$out"
cp "$work/build/bin/hermes" "$out/hermes"
(cd "$out" && sha256sum hermes >hermes.sha256)
echo "Built $("$out/hermes" --version | grep 'release version' | xargs) at $commit into $out."
