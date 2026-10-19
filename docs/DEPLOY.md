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

1. Local: `git remote add origin git@github.com:maptiq/maptiq.github.io.git`, then `ssh -T git@github.com`
   once (it must greet your GitHub user).
2. Push the code to a new branch without touching Pages: `git push origin main:main`. The workflow
   builds; its deploy step fails until steps 3 and 4 are done. That is expected.
   **Do not change the Pages source to branch `main`**: GitHub would run Jekyll over the Astro source
   (the build fails) and drop the custom domain, because the repository root of `main` has no
   `CNAME` file (ours is generated into the build output). The site then shows "Site not found".
3. Settings > Environments > `github-pages` > Deployment branches and tags: add `main` (or allow all
   branches). Without this the deploy job fails with "Invalid deployment branch ... Deployments are
   only allowed from master" (seen on the first attempt, 19 Oct 2026).
4. Settings > Pages > Build and deployment > Source: **GitHub Actions**, and in the same page set
   Custom domain to `maptiq.eu` and save (the domain is a repository setting when deploying with
   Actions). Then Actions > "Deploy to GitHub Pages" > Re-run the failed jobs. The site switches within
   a minute or two. Keep "Enforce HTTPS" on; after re-binding the domain GitHub may need a few
   minutes (rarely up to an hour) to issue the certificate again.
5. `npm run check:live`. Optional: Settings > General > default branch: `main`.

Rollback (also the fastest way to bring the old site back): Settings > Pages > Source "Deploy from a
branch", `master`, `/ (root)`, Custom domain `maptiq.eu` (master's `CNAME` file restores it). The old site is intact.

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
