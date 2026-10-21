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

/* -----------------------------------------------------------------------
   Общий помощник для сохранения/шеринга файлов внутри Telegram Mini App.
   Обычный <a download> с blob-ссылкой в WebView Telegram не срабатывает,
   поэтому файл временно загружается на воркер, а дальше Telegram either
   скачивает его по ссылке (tg.downloadFile), либо мы просто возвращаем
   публичный URL вызывающему коду (например, чтобы шарить картинку, а не
   голую ссылку на сайт). Используется и в app.js, и в feed.js.
------------------------------------------------------------------------ */
(() => {
  function api(){ return (window.COLORLETTE_PRO_API || "").replace(/\/$/, ""); }
  function tgApp(){ return window.Telegram && window.Telegram.WebApp; }

  // Загружает blob на воркер и возвращает { ok, url }. Ничего не скачивает сама —
  // только отдаёт публичную ссылку на файл (пригодится и для download, и для share).
  async function uploadFile(blob, filename){
    const tg = tgApp(), base = api();
    if (!tg || !tg.initData || !base) return { ok: false, url: null };
    try {
      const r = await fetch(base + "/file/upload?name=" + encodeURIComponent(filename) + "&type=" + encodeURIComponent(blob.type || "application/octet-stream"), {
        method: "POST",
        headers: { "X-Telegram-Init-Data": tg.initData, "Content-Type": "application/octet-stream" },
        body: blob,
        credentials: "omit"
      });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || ("HTTP " + r.status));
      return { ok: true, url: j.url };
    } catch (e) { return { ok: false, url: null, error: e }; }
  }

  // Сохраняет файл «как положено» в текущей среде: внутри Telegram — через
  // воркер + tg.downloadFile/openLink, в обычном браузере — через <a download>.
  async function saveFile(blob, filename){
    const tg = tgApp();
    if (tg && tg.initData){
      const res = await uploadFile(blob, filename);
      if (res.ok && res.url){
        try {
          if (typeof tg.downloadFile === "function" && (!tg.isVersionAtLeast || tg.isVersionAtLeast("8.0"))){
            tg.downloadFile({ url: res.url, file_name: filename });
          } else if (tg.openLink){ tg.openLink(res.url); }
          else { window.open(res.url, "_blank"); }
        } catch {}
        return res;
      }
      return res; // ok:false — вызывающий код сам решит, что делать (например, показать шторку с картинкой)
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    a.style.position = "fixed"; a.style.left = "-9999px";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, url: null };
  }

  window.ColorletteUploadFile = uploadFile;
  window.ColorletteSaveFile = saveFile;
})();
