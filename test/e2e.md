# ListBridge Manual Test Scenarios

These end-to-end flows can be performed entirely in a local browser without server code.

1. **First run setup**
   - Serve the repository root using `npm run dev` or `python3 -m http.server`.
   - Visit `http://localhost:4173` (or the port you chose).
   - Confirm the welcome page renders with dark/light toggle.

2. **OAuth configuration**
   - Open `/docs/OAUTH_SETUP_SPOTIFY.md` and `/docs/OAUTH_SETUP_GOOGLE.md` to create client IDs.
   - In the app, navigate to **Connect** and enter the client IDs. Save and verify redirect URIs match.
   - Click **Connect Spotify** and complete the PKCE flow. Repeat for Google.

3. **Playlist import/export**
   - On **Select**, click *Load Spotify playlists*. A list of playlists should appear.
   - Select a playlist and ensure the preview table shows tracks.
   - Click **Export JSON/CSV** and verify files download.
   - Use the buttons to import `data/sample-playlists.json` and `data/sample-playlists.csv` + `data/sample-tracks.csv`.

4. **Auto matching**
   - Navigate to **Match** and run *Auto matching*.
   - For tracks below the confidence threshold, review manual suggestions and select the best candidate.

5. **Transfer & Resume**
   - Go to **Transfer** and start the transfer. Observe the progress bar and quota hint.
   - During transfer, refresh the page to verify the resume banner appears. Resume the operation.

6. **Report**
   - After completion, open **Report** to view logs and failure counts.
   - Download the failure CSV (if available) from the log section for troubleshooting.

7. **PWA smoke test**
   - Open Chrome DevTools → Lighthouse. Run audits without PWA; expect 90+ scores per specification.

