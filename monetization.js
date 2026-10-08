/* the colorlette° — Pro pricing UI. Payments are handled by the Telegram backend when configured. */
(() => {
  const DEBUG = true; // после проверки поставь false
  const API_BASE = (window.COLORLETTE_PRO_API || '').replace(/\/$/, '');
  const tg = window.Telegram?.WebApp;
  const state = { pro: false, loading: false, plan: null };
  const $ = id => document.getElementById(id);
  const open = () => { $('donateBackdrop')?.classList.add('show'); document.body.style.overflow = 'hidden'; };
  const close = () => { $('donateBackdrop')?.classList.remove('show'); document.body.style.overflow = ''; };
  const dbg = msg => { if (DEBUG) { try { alert('DEBUG ' + msg); } catch {} } };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const notify = () => window.dispatchEvent(new CustomEvent('colorlette:pro-updated'));

  async function refresh() {
    if (!tg?.initData) return state.pro; // обычный сайт, не Telegram
    if (!API_BASE) { dbg('COLORLETTE_PRO_API is empty'); return state.pro; }
    try {
      const r = await fetch(API_BASE + '/pro/status', {
        headers: { 'X-Telegram-Init-Data': tg.initData },
        credentials: 'omit'
      });
      const text = await r.text();
      let j = {};
      try { j = JSON.parse(text); } catch {}
      if (r.ok) {
        const was = state.pro;
        state.pro = !!(j.pro || j.active);
        if (state.pro !== was) notify();
      } else {
        dbg('status ' + r.status + ' ' + text.slice(0, 200));
      }
    } catch (e) {
      dbg('status fetch failed: ' + e);
    }
    return state.pro;
  }

  async function buy(plan) {
    state.plan = plan;
    if (!API_BASE || !tg?.initData || !tg.openInvoice) {
      const el = $('proNote');
      if (el) el.textContent = el.dataset.web || 'Open the app in Telegram to purchase Pro with Stars.';
      return false;
    }
    if (state.loading) return false;
    state.loading = true;
    try {
      const r = await fetch(API_BASE + '/pro/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': tg.initData },
        body: JSON.stringify({ product: 'pro', plan }),
        credentials: 'omit'
      });
      const text = await r.text();
      let j = {};
      try { j = JSON.parse(text); } catch {}

      if (!r.ok) {
        if (/already active/i.test(text)) {
          await refresh();
          if (state.pro) { close(); return true; }
        }
        dbg('invoice ' + r.status + ' ' + text.slice(0, 200));
        return false;
      }

      const link = j.url || j.invoice;
      if (!link) { dbg('no invoice link: ' + text.slice(0, 200)); return false; }

      await new Promise((resolve, reject) => tg.openInvoice(link, status => {
        if (status === 'paid') resolve();
        else if (status === 'cancelled' || status === 'failed') reject(new Error(status));
      }));

      // webhook может прийти с небольшой задержкой — проверяем статус несколько раз
      for (let i = 0; i < 6 && !state.pro; i++) {
        await refresh();
        if (!state.pro) await sleep(1500);
      }
      notify();
      if (state.pro) close();
      return state.pro;
    } catch (e) {
      return false; // отмена оплаты
    } finally {
      state.loading = false;
    }
  }

  window.ColorlettePro = { isPro: () => state.pro, refresh, buy, open, close };

  document.addEventListener('click', e => {
    const proEl = e.target.closest('[data-pro]');
    if (proEl && !state.pro) {
      e.preventDefault();
      e.stopImmediatePropagation();
      // перед показом тарифов ещё раз спрашиваем сервер
      refresh().then(isPro => {
        if (isPro) proEl.click();
        else open();
      });
      return;
    }
    const plan = e.target.closest('.pricing-card');
    if (plan) { e.preventDefault(); buy(plan.dataset.plan); }
  }, true);

  $('donateBtn')?.addEventListener('click', open);
  const donateLink = $('donateCoffeeLink');
  if (donateLink) {
    if (window.COLORLETTE_DONATE_URL) donateLink.href = window.COLORLETTE_DONATE_URL;
    else donateLink.hidden = true;
  }
  $('donateModalClose')?.addEventListener('click', close);
  $('donateBackdrop')?.addEventListener('click', e => { if (e.target.id === 'donateBackdrop') close(); });

  refresh();
})();
