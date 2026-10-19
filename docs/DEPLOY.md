# Deploying maptiq.eu

## What is there today (checked 19 Oct 2026, read-only)

- `github.com/maptiq/maptiq.github.io`, public. Only branch: `master`, last push 22 Aug 2022.
- `master` holds the **old Jekyll source** (`_config.yml`, `_layouts`, `CNAME`, ...). No workflows.
  GitHub Pages serves it with its built-in Jekyll build ("deploy from a branch"). Live headers:
  `server: GitHub.com`, `last-modified: 22 Aug 2022`.
- DNS: `maptiq.eu` A records on GitHub's IPs, `www` CNAME `maptiq.github.io`. Custom domain is set
  in the repository settings.
- Old URLs that exist: `/services/`, `/services/konzultacio/`, `/team/`, `/team/<3 members>/`,
  `/about/`, `/contact/`. `/services/surviot/`, `/sitemap.xml`, `/robots.txt` and `/404.html` are 404
  already. All old pages are Hungarian, so they redirect to `/hu/...`.

## Whose account pushes

Commits and pushes use **sandor.csaba@gmail.com** (repo-local `git config user.email`), not the
company mailbox. The GitHub user that owns the SSH key must have write access to
`maptiq/maptiq.github.io` (collaborator or org member): check at github.com/maptiq/maptiq.github.io >
Settings > Collaborators, or just try the first push. `scripts/deploy.sh` refuses to push if any
commit carries another author or committer email (`DEPLOY_GIT_EMAIL` overrides the expected one).

## Why we do not push to master

Pages would run Jekyll over our Astro source and the live site would break. And master is the only
copy of the old site besides git history. So: new site on branch `main`, `master` untouched.

## One-time switch (about two minutes of possible downtime)

1. Local: `git remote add origin git@github.com:maptiq/maptiq.github.io.git`. This machine had no
   GitHub host key, so first run `ssh -T git@github.com` once and confirm the fingerprint
   (compare with https://docs.github.com/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints).
2. Push the code to a new branch without switching Pages yet:
   `git push origin main:main`. The workflow runs and builds; its deploy step fails because the
   Pages source is still "branch". That is expected and changes nothing live.
3. Settings > Pages > Build and deployment > Source: **GitHub Actions**
   (or `gh api -X PUT repos/maptiq/maptiq.github.io/pages -f build_type=workflow`).
4. Actions > "Deploy to GitHub Pages" > Re-run all jobs. The site switches within a minute or two.
   Custom domain `maptiq.eu` stays; keep "Enforce HTTPS" on.
5. `npm run check:live`. Optional: Settings > General > default branch: `main`.

Rollback: set Source back to "Deploy from a branch", `master`, `/ (root)`. The old site is intact.

## Every later deploy

`npm run deploy` (verify, push `main`, wait for the workflow, live check). Dry run that pushes
nothing: `DEPLOY_DRY_RUN=1 bash scripts/deploy.sh`.

## Notes

- With "GitHub Actions" as source the `CNAME` file in the build is not what sets the domain (the
  repository setting is), but we keep `public/CNAME` so a move back to branch deploys works.
- GitHub Pages sends no real 301 for the old URLs: they are meta-refresh pages (Astro `redirects`).
  Search engines treat instant meta refreshes like 301s, but if real 301s matter, host on Apache
  with `public/.htaccess` (`DEPLOY_MODE=ssh`).
- GitHub Pages cannot set headers (security headers, cache). Apache can (`public/.htaccess`).
