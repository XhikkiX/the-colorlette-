/* the colorlette° — Pro pricing UI. Payments are handled by the Telegram backend when configured. */
(() => {
  const API_BASE = window.COLORLETTE_PRO_API || '';
  const tg = window.Telegram?.WebApp;
  const state = { pro:false, loading:false, plan:null };
  const $ = id => document.getElementById(id);
  const modal = () => $('donateModal');
  const open = () => { $('donateBackdrop')?.classList.add('show'); document.body.style.overflow='hidden'; };
  const close = () => { $('donateBackdrop')?.classList.remove('show'); document.body.style.overflow=''; };
  const note = (key='proPricingNote') => { const el=$('proNote'); if(el) el.textContent=(window.t?.(key)||el.textContent); };
  async function refresh(){
    if(!API_BASE || !tg?.initData) return state.pro;
    try{
      const r=await fetch(API_BASE.replace(/\/$/,'')+'/pro/status',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({initData:tg.initData}),
        credentials:'omit'
      });
      if(r.ok){const j=await r.json();state.pro=!!j.active;}
    }catch{}
    return state.pro;
  }
  async function buy(plan){
    state.plan=plan;
    if(!API_BASE || !tg?.initData || !tg.openInvoice){
      const el=$('proNote'); if(el) el.textContent=el.dataset.web||'Open the app in Telegram to purchase Pro with Stars.';
      return false;
    }
    if(state.loading) return false;
    state.loading=true;
    try{
      const r=await fetch(API_BASE.replace(/\/$/,'')+'/pro/invoice',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({initData:tg.initData,plan}),
        credentials:'omit'
      });
      if(!r.ok) throw new Error('invoice');
      const {invoice}=await r.json();
      await new Promise((resolve,reject)=>tg.openInvoice(invoice,status=>{if(status==='paid')resolve();else if(status==='cancelled'||status==='failed')reject(new Error(status));}));
      await refresh();
      window.dispatchEvent(new CustomEvent('colorlette:pro-updated'));
      if(state.pro) close();
      return state.pro;
    }catch{return false}finally{state.loading=false}
  }
  window.ColorlettePro={isPro:()=>state.pro,refresh,buy,open,close};
  document.addEventListener('click',e=>{
    const pro=e.target.closest('[data-pro]');
    if(pro && !state.pro){e.preventDefault();e.stopImmediatePropagation();open();return}
    const plan=e.target.closest('.pricing-card');
    if(plan){e.preventDefault();buy(plan.dataset.plan)}
  },true);
  $('donateBtn')?.addEventListener('click',open);
  const donateLink = $('donateCoffeeLink');
  if(donateLink){
    if(window.COLORLETTE_DONATE_URL){ donateLink.href=window.COLORLETTE_DONATE_URL; }
    else { donateLink.hidden=true; }
  }
  $('donateModalClose')?.addEventListener('click',close);
  $('donateBackdrop')?.addEventListener('click',e=>{if(e.target.id==='donateBackdrop')close()});
  refresh();
})();
