# Nudgeboard

Nudgeboard is a local-first follow-up radar for the things you are waiting on: a reply, a quote, a booking, or the next small move. It keeps open loops visible without asking for an account or sending anything to a server.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish with GitHub Pages

The included workflow at `.github/workflows/deploy-pages.yml` deploys the repository on every push to `main`.

Live site: https://technothatch.github.io/nudgeboard/

1. Push the repository to GitHub.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. Push to `main` or run **Deploy static site to GitHub Pages** from the Actions tab.

Data is stored in the browser's `localStorage`. Use **Export** for a JSON backup and **Import** to restore it on another browser or device.