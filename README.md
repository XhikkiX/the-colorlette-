# the colorlette°

A client-side color studio prepared for GitHub Pages and Telegram Mini Apps.

## GitHub Pages

Push the repository to `main`. The included GitHub Actions workflow publishes the repository root with GitHub Pages. GitHub Pages serves `github.io` sites over HTTPS automatically; a custom domain is also supported. See the official GitHub Pages docs for custom-domain/HTTPS setup.

## Telegram Mini App

The app loads Telegram's official WebApp SDK, calls `ready()`/`expand()`, follows Telegram theme/viewport changes, and respects safe-area insets. It also works as a normal website outside Telegram.

Telegram recommends validating `Telegram.WebApp.initData` on your backend before trusting user identity. The frontend therefore never sends or stores a bot token.

## Monetization

The free studio remains fully usable. **Colorlette Pro** is a one-time 99 Stars purchase that unlocks:

- high-resolution PNG palette boards;
- Adobe ASE, GIMP and Procreate swatches;
- future Pro export features.

For digital goods inside Telegram, payments must use Telegram Stars (`XTR`). The bot backend must handle `pre_checkout_query` and `successful_payment`, and should store the resulting entitlement. Telegram also requires support for payment issues via `/paysupport`.

### Backend

The `server/` folder contains a Cloudflare Worker reference implementation:

1. Create a Telegram bot with @BotFather.
2. Deploy `server/worker.js` to Cloudflare Workers.
3. Create a KV namespace and bind it as `PRO_KV`.
4. Set Worker secrets `BOT_TOKEN` and `WEBHOOK_SECRET`.
5. Point Telegram's webhook to `https://YOUR-WORKER/telegram/webhook` with the same secret token.
6. Put the Worker URL into `js/config.js`:

```js
window.COLORLETTE_PRO_API = 'https://YOUR-WORKER.example.workers.dev';
```

Never commit `BOT_TOKEN` to GitHub.

## Local development

Serve over HTTP rather than opening `index.html` directly:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.
