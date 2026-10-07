/* Telegram Mini App bridge. Safe to load on the normal website too. */
(() => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  document.documentElement.classList.add('tg-mini-app');
  try { tg.ready(); } catch {}
  try { tg.expand(); } catch {}
  try { tg.setHeaderColor?.(tg.backgroundColor || '#f6f5f1'); } catch {}
  try { tg.setBackgroundColor?.(tg.backgroundColor || '#f6f5f1'); } catch {}
  const syncTheme = () => {
    const scheme = tg.colorScheme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = scheme;
  };
  syncTheme();
  tg.onEvent?.('themeChanged', syncTheme);
  const syncViewport = () => {
    const h = tg.viewportStableHeight || tg.viewportHeight;
    if (h) document.documentElement.style.setProperty('--tg-stable-height', `${Math.round(h)}px`);
  };
  syncViewport();
  tg.onEvent?.('viewportChanged', syncViewport);
  tg.onEvent?.('safeAreaChanged', syncViewport);
  window.ColorletteTelegram = tg;
})();
