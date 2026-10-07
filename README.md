# the colorlette°

A client-side color studio prepared for GitHub Pages and Telegram Mini Apps.

## GitHub Pages

This mobile-friendly version keeps the website files in the repository root so they can be uploaded from a phone without creating folders.

In GitHub, open **Settings → Pages** and choose **Deploy from a branch**, then select `main` and `/ (root)`.

## Telegram Mini App

The app loads Telegram's official WebApp SDK, calls `ready()`/`expand()`, follows Telegram theme/viewport changes, and respects safe-area insets.

## Local development

Serve over HTTP rather than opening `index.html` directly:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.
