#!/usr/bin/env bash
# Deploy maptiq.eu. Run through `npm run deploy` (verifies first) or `npm run deploy:only`.
#
# DEPLOY_MODE=github (default)  push main; the GitHub Actions workflow builds and publishes to
#                               GitHub Pages. The script waits for it and then runs check-live.
# DEPLOY_MODE=ssh               upload dist as a zip to an Apache host over scp/ssh, wipe the web
#                               root, unzip, fix permissions (same flow as fototerkep.hu). Needs
#                               DEPLOY_HOST, optional DEPLOY_PORT and DEPLOY_DIR. public/.htaccess
#                               carries the https/www rules and the 301s for the old URLs.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${DEPLOY_MODE:-github}"
SITE="${DEPLOY_SITE:-https://maptiq.eu}"

if [ "$MODE" = "github" ]; then
  branch=$(git rev-parse --abbrev-ref HEAD)
  [ "$branch" = "main" ] || { echo "on branch $branch, deploy from main" >&2; exit 1; }
  [ -z "$(git status --porcelain)" ] || { echo "uncommitted changes, commit first" >&2; exit 1; }
  git remote get-url origin >/dev/null 2>&1 || { echo "no git remote 'origin'; create the GitHub repository and add it" >&2; exit 1; }
  echo "Pushing main ..."
  git push origin main
  if command -v gh >/dev/null 2>&1; then
    echo "Waiting for the Pages workflow ..."
    sleep 5
    run=$(gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId')
    gh run watch "$run" --exit-status
  else
    echo "gh not installed: waiting 90 s for the workflow instead"
    sleep 90
  fi
elif [ "$MODE" = "ssh" ]; then
  HOST="${DEPLOY_HOST:?set DEPLOY_HOST=user@host}"
  PORT="${DEPLOY_PORT:-22}"
  DIR="${DEPLOY_DIR:-public_html}"
  ZIP="maptiq-dist.zip"
  [ -d dist ] || { echo "dist/ not found, run npm run build first" >&2; exit 1; }
  rm -f "$ZIP"; (cd dist && zip -qr "../$ZIP" .)
  echo "Uploading $ZIP to $HOST:$PORT ..."
  scp -q -P "$PORT" "$ZIP" "$HOST:$ZIP"
  ssh -p "$PORT" "$HOST" "DIR='$DIR' ZIP='$ZIP' bash -s" <<'REMOTE'
set -euo pipefail
case "$DIR" in ""|/|.|..|~) echo "refusing to wipe '$DIR'" >&2; exit 1 ;; esac
[ -d "$DIR" ] || { echo "$DIR not found" >&2; exit 1; }
unzip -tq "$ZIP" >/dev/null   # abort before wiping if the zip is broken
find "$DIR" -mindepth 1 -delete
unzip -oq "$ZIP" -d "$DIR"
unzip -Z1 ~/"$ZIP" | while IFS= read -r f; do
  case "$f" in
    */) chmod 755 "$DIR/$f" ;;
    *)  chmod 644 "$DIR/$f" ;;
  esac
done
chmod 755 "$DIR"
rm -f ~/"$ZIP"
REMOTE
else
  echo "unknown DEPLOY_MODE $MODE" >&2; exit 1
fi

echo "Deployed. Running the live check against $SITE ..."
bash scripts/check/check-live.sh "$SITE"
