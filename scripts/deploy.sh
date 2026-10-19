#!/usr/bin/env bash
# Deploy maptiq.eu. Run through `npm run deploy` (verifies first) or `npm run deploy:only`.
#
# DEPLOY_MODE=github (default)  push this repo's main to origin/main; the GitHub Actions workflow
#                               (.github/workflows/deploy.yml) builds and publishes to GitHub Pages.
# DEPLOY_MODE=ssh               upload dist as a zip to an Apache host over scp/ssh, wipe the web
#                               root, unzip, fix permissions (same flow as fototerkep.hu). Needs
#                               DEPLOY_HOST, optional DEPLOY_PORT and DEPLOY_DIR. public/.htaccess
#                               carries the https/www rules and the 301s for the old URLs.
# DEPLOY_DRY_RUN=1              run the checks and print what would happen, push nothing.
#
# GitHub facts (checked October 2026): the site lives in github.com/maptiq/maptiq.github.io. Its
# branch `master` holds the OLD Jekyll site and is what Pages serves today ("deploy from a branch",
# no workflows). We never touch master: the new site goes to branch `main`, so the old site stays
# in git history. One-time switch, see docs/DEPLOY.md: Settings > Pages > Source: GitHub Actions.
# Until that is set GitHub would run Jekyll over our Astro source and break the live site, so
# this script refuses to push when it can see the source is not "workflow".
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${DEPLOY_MODE:-github}"
SITE="${DEPLOY_SITE:-https://maptiq.eu}"
DRY="${DEPLOY_DRY_RUN:-0}"
REMOTE_BRANCH="${DEPLOY_BRANCH:-main}"
say() { echo "$*"; }
run() { if [ "$DRY" = 1 ]; then echo "[dry run] $*"; else "$@"; fi; }

if [ "$MODE" = "github" ]; then
  branch=$(git rev-parse --abbrev-ref HEAD)
  [ "$branch" = "main" ] || { echo "on branch $branch, deploy from main" >&2; exit 1; }
  [ -z "$(git status --porcelain)" ] || { echo "uncommitted changes, commit first" >&2; exit 1; }
  # Commits are pushed under the owner's GitHub identity, not the company mailbox.
  want="${DEPLOY_GIT_EMAIL:-sandor.csaba@gmail.com}"
  bad=$(git log --format='%h %ae %ce' | awk -v w="$want" '$2 != w || $3 != w' | head -3)
  if [ -n "$bad" ]; then
    echo "commits not authored/committed as $want (set git config user.email, then re-author):" >&2
    echo "$bad" >&2; exit 1
  fi
  url=$(git remote get-url origin 2>/dev/null) || { echo "no remote 'origin'. Add it: git remote add origin git@github.com:maptiq/maptiq.github.io.git" >&2; exit 1; }
  repo=$(echo "$url" | sed -E 's#^.*github\.com[:/]##; s#\.git$##')
  say "Deploying $(git rev-parse --short HEAD) to $repo, branch $REMOTE_BRANCH"

  # The Pages source must be the workflow, or GitHub builds our source with Jekyll.
  if command -v gh >/dev/null 2>&1; then
    build_type=$(gh api "repos/$repo/pages" --jq .build_type 2>/dev/null || echo unknown)
    if [ "$build_type" != "workflow" ] && [ "${DEPLOY_SKIP_PAGES_CHECK:-0}" != 1 ]; then
      echo "Pages source of $repo is '$build_type', not 'workflow'. Set it first (see docs/DEPLOY.md):" >&2
      echo "  gh api -X PUT repos/$repo/pages -f build_type=workflow" >&2
      exit 1
    fi
    # The github-pages environment must allow deployments from this branch.
    if ! gh api "repos/$repo/environments/github-pages" --jq '.deployment_branch_policy | tostring' 2>/dev/null | grep -q null; then
      pol=$(gh api "repos/$repo/environments/github-pages/deployment-branch-policies" --jq '[.branch_policies[].name] | join(",")' 2>/dev/null || echo unknown)
      case ",$pol," in *",$REMOTE_BRANCH,"*|*",*,"*) ;; *)
        echo "environment github-pages only allows branches: $pol. Add $REMOTE_BRANCH (docs/DEPLOY.md step 3)." >&2
        [ "${DEPLOY_SKIP_PAGES_CHECK:-0}" = 1 ] || exit 1 ;; esac
    fi
  else
    echo "note: gh is not installed, so the Pages source could not be checked. It must be 'GitHub Actions' (docs/DEPLOY.md)."
  fi

  run git push origin "main:$REMOTE_BRANCH"

  if [ "$DRY" != 1 ]; then
    if command -v gh >/dev/null 2>&1; then
      say "Waiting for the Pages workflow ..."
      sleep 6
      run_id=$(gh run list --repo "$repo" --workflow deploy.yml --branch "$REMOTE_BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')
      gh run watch "$run_id" --repo "$repo" --exit-status
    else
      say "Polling $SITE/en/ until the new site answers (up to 10 minutes) ..."
      for _ in $(seq 40); do
        [ "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/en/")" = "200" ] && break
        sleep 15
      done
    fi
  fi
elif [ "$MODE" = "ssh" ]; then
  HOST="${DEPLOY_HOST:?set DEPLOY_HOST=user@host}"
  PORT="${DEPLOY_PORT:-22}"
  DIR="${DEPLOY_DIR:-public_html}"
  ZIP="maptiq-dist.zip"
  [ -d dist ] || { echo "dist/ not found, run npm run build first" >&2; exit 1; }
  if [ "$DRY" = 1 ]; then
    echo "[dry run] zip dist, scp to $HOST:$PORT, wipe $DIR, unzip, chmod 755 dirs / 644 files"
  else
    rm -f "$ZIP"; (cd dist && zip -qr "../$ZIP" .)
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
  fi
else
  echo "unknown DEPLOY_MODE $MODE" >&2; exit 1
fi

if [ "$DRY" = 1 ]; then
  say "[dry run] then: bash scripts/check/check-live.sh $SITE"
else
  say "Deployed. Running the live check against $SITE ..."
  bash scripts/check/check-live.sh "$SITE"
fi
