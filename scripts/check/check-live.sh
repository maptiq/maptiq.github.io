#!/usr/bin/env bash
# After deployment, against the real host. Checks:
#  - every URL in the sitemap answers 200
#  - the old Jekyll URLs (scripts/old_urls.txt) lead to the right page: 301 on Apache, meta refresh on GitHub Pages
#  - an unknown URL answers 404, "/" answers 200
#  - the HTML sets no Google script before consent, and carries the analytics ID for the banner
#  - http and www variants end on https://maptiq.eu/
# Usage: scripts/check/check-live.sh [https://maptiq.eu]
BASE="${1:-https://maptiq.eu}"
BASE="${BASE%/}"
LIST="$(dirname "$0")/../old_urls.txt"
pass=0; fail=0
ok()  { pass=$((pass + 1)); }
bad() { fail=$((fail + 1)); echo "FAIL $1"; }
code() { curl -s -o /dev/null --max-time 20 -w '%{http_code}' "$1"; }

# Sitemap: the index points to sitemap-0.xml, which lists every page.
urls=$(curl -s --max-time 20 "$BASE/sitemap-index.xml" | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' | while read -r s; do curl -s --max-time 20 "$BASE/${s#*://*/}" | grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g'; done)
[ -n "$urls" ] || bad "sitemap-index.xml is empty or unreachable"
for u in $urls; do
  # Compare on the path, so the check also works against a staging host.
  path="/${u#*://*/}"
  c=$(code "$BASE$path"); [ "$c" = "200" ] && ok || bad "$path answered $c"
done

# Old URLs: a 301 to the right page (Apache with .htaccess), or a 200 meta-refresh stub (GitHub Pages).
while read -r old new; do
  case "$old" in ""|\#*) continue ;; esac
  read -r c loc < <(curl -s --max-time 20 -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE$old")
  if [ "$c" = "301" ] && [ "$loc" = "$BASE$new" ]; then ok
  elif [ "$c" = "200" ] && curl -s --max-time 20 "$BASE$old" | grep -q "url=$new"; then ok
  else bad "$old answered $c $loc, expected a 301 or refresh to $new"; fi
  c=$(code "$BASE$new"); [ "$c" = "200" ] && ok || bad "$new (target of $old) answered $c"
done < "$LIST"

c=$(code "$BASE/nincs-ilyen-oldal/"); [ "$c" = "404" ] && ok || bad "unknown URL answered $c, expected 404"
c=$(code "$BASE/"); [ "$c" = "200" ] && ok || bad "/ answered $c"

# Privacy: nothing from Google in the HTML before consent.
for l in en hu de; do
  html=$(curl -s --max-time 20 "$BASE/$l/")
  if echo "$html" | grep -q '<script[^>]*src="[^"]*\(googletagmanager\|google-analytics\)'; then bad "/$l/ loads Google before consent"; else ok; fi
  if echo "$html" | grep -q 'data-ga-id="G-'; then ok; else echo "note /$l/ has no analytics banner (no measurement ID set)"; fi
done
curl -s --max-time 20 "$BASE/robots.txt" | grep -q '^Sitemap:' && ok || bad "robots.txt has no Sitemap line"

# http and www must end on the canonical https host (GitHub Pages sends a 301).
host=${BASE#https://}
if [ "$host" = "maptiq.eu" ]; then
  for v in "http://maptiq.eu/en/" "http://www.maptiq.eu/en/" "https://www.maptiq.eu/en/"; do
    read -r c url < <(curl -s -L --max-redirs 3 --max-time 20 -o /dev/null -w '%{http_code} %{url_effective}' "$v")
    if [ "$c" = "200" ] && [ "$url" = "https://maptiq.eu/en/" ]; then ok; else bad "$v ended on $url ($c)"; fi
  done
fi

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
