# Deploying ListBridge on GitHub Pages

ListBridge is designed for zero-backend static hosting. These steps publish the app via GitHub Pages.

## Prerequisites

- GitHub account with access to the repository.
- Spotify & Google OAuth apps configured (see respective guides).

## Steps

1. **Repository setup**
   - Fork or clone the repo to your GitHub account.
   - Push the code to the `main` branch.

2. **GitHub Pages configuration**
   - Open the repository on GitHub → *Settings* → *Pages*.
   - Set the source to `Deploy from a branch` → `main` → `/ (root)`.
   - Save. GitHub issues a Pages URL like `https://<username>.github.io/<repo>/`.

3. **SPA routing**
   - No special 404 handling is required because routes live in the hash (`#/path`).
   - Optional: add a `CNAME` file at the repo root for custom domains.

4. **Redirect URIs**
   - Spotify redirect: `https://<username>.github.io/<repo>/callback/spotify`
   - Google redirect: `https://<username>.github.io/<repo>/callback/google`
   - These must match exactly (case sensitive) when registering apps.

5. **Client IDs**
   - After the site is live, open it in a browser and navigate to **Connect**.
   - Paste the Spotify and Google client IDs into the credentials form and click **Save**. The values stay on that browser (enable encrypted storage if you want them persisted).
   - The **Connect** cards will enable their login buttons immediately—no redeploy required.

6. **Testing**
   - Run through the flows in `test/e2e.md`.
   - Validate CSP headers by checking the browser console for blocked requests (should be none beyond APIs).

7. **First deployment checklist**
   1. ✅ Repo pushed to GitHub.
   2. ✅ GitHub Pages enabled on `main`.
   3. ✅ CNAME (optional) committed for custom domain.
   4. ✅ Spotify & Google apps configured with Pages redirect URIs.
   5. ✅ Spotify/Google client IDs saved through the Connect form on the deployed site.
   6. ✅ OAuth consent screens published (Google requires production publishing for external use).
   7. ✅ App loads via HTTPS and passes manual tests.

## Updating

- Commit & push changes to `main`. Pages automatically rebuilds.
- If CSP changes are needed, edit the `<meta http-equiv="Content-Security-Policy">` tag in `index.html`.
- Client IDs live in the browser. If they change, revisit the deployed site, open **Connect**, and update the credentials form.

