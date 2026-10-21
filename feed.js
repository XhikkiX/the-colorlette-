/* the colorlette° — Feed mode: бесконечная лента палитр в стиле Shorts.
   Подключается ДО app.js; app.js в конце вызывает ColoretteFeed.init(bridge). */
(() => {
"use strict";

const tg = window.ColorletteTelegram || null;
const wantOpen = new URLSearchParams(location.search).get("v") === "feed"; // читаем до того, как app.js зачистит URL
const LS_PREFS = "colorletteFeedPrefs", LS_SEEN = "colorletteFeedSeen", LS_VISITED = "colorletteFeedVisited";

/* ============================ i18n ============================ */
Object.assign(translations.en, {
  feedBtnTitle:"Palette feed", feedCta:"Swipe palettes", feedClose:"Close", feedLike:"Like", feedApply:"Apply", feedShare:"Share",
  feedCopy:"Copy palette", feedMore:"More", feedTune:"Feed settings", feedNext:"Next palette", feedPrev:"Previous palette",
  feedToastLiked:"Saved to History ♥", feedToastUnliked:"Removed from favorites", feedToastApplied:"Palette applied",
  feedToastHex:"{v} copied", feedToastImage:"Image saved", feedToastTuned:"Feed updated", feedCoach:"Swipe up for the next one · double-tap to like",
  feedMoreHex:"Copy HEX codes", feedMoreCss:"Copy CSS variables", feedMoreLink:"Copy link", feedMoreImage:"Save as image", feedOpenIn:"Open in studio",
  feedTuneTitle:"Tune your feed", feedTuneSub:"New palettes will follow your taste.", feedMood:"Mood", feedAny:"Any", feedCount:"Colors per palette", feedMix:"Mix",
  feedShareText:"“{name}” — a palette from the colorlette°", feedSheetLabel:"Palette actions",
  feedImgTitle:"Your image is ready", feedImgHint:"Press and hold the image, then choose “Save image”.", feedImgShare:"Send / save via…", feedImgCopy:"Copy image", feedToastImgCopied:"Image copied"
});
Object.assign(translations.ru, {
  feedBtnTitle:"Лента палитр", feedCta:"Листать палитры", feedClose:"Закрыть", feedLike:"Лайк", feedApply:"Применить", feedShare:"Поделиться",
  feedCopy:"Копировать палитру", feedMore:"Ещё", feedTune:"Настройки ленты", feedNext:"Следующая палитра", feedPrev:"Предыдущая палитра",
  feedToastLiked:"Сохранено в историю ♥", feedToastUnliked:"Убрано из избранного", feedToastApplied:"Палитра применена",
  feedToastHex:"{v} скопирован", feedToastImage:"Картинка сохранена", feedToastTuned:"Лента обновлена", feedCoach:"Свайп вверх — следующая · двойной тап — лайк",
  feedMoreHex:"Скопировать HEX-коды", feedMoreCss:"Скопировать CSS-переменные", feedMoreLink:"Скопировать ссылку", feedMoreImage:"Сохранить картинкой", feedOpenIn:"Открыть в студии",
  feedTuneTitle:"Настройте ленту", feedTuneSub:"Новые палитры подстроятся под ваш вкус.", feedMood:"Настроение", feedAny:"Любое", feedCount:"Цветов в палитре", feedMix:"Микс",
  feedShareText:"«{name}» — палитра из the colorlette°", feedSheetLabel:"Действия с палитрой",
  feedImgTitle:"Картинка готова", feedImgHint:"Нажмите на картинку и удерживайте, затем выберите «Сохранить изображение».", feedImgShare:"Отправить / сохранить через…", feedImgCopy:"Копировать картинку", feedToastImgCopied:"Картинка скопирована"
});

/* ============================ цвет ============================ */
const rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const lin = v => { v /= 255; return v <= .04045 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); };
const lum = h => { const [r,g,b] = rgb(h); return .2126*lin(r)+.7152*lin(g)+.0722*lin(b); };
const cr = (a,b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
function oklab(h){
  const [r,g,b] = rgb(h).map(lin);
  const l = Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),
        m = Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),
        s = Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s, 1.9779984951*l-2.428592205*m+.4505937099*s, .0259040371*l+.7827717662*m-.808675766*s];
}
const dist = (a,b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
const chroma = lab => Math.hypot(lab[1], lab[2]);

// цвет текста для плашки: берём цвет ИЗ ПАЛИТРЫ с лучшим контрастом (как в референсах),
// и только если подходящего нет — почти чёрный / белый
function textFor(i, pal){
  const bg = pal[i]; let best = null, bs = 0;
  pal.forEach((c,j) => { if (j === i) return; const r = cr(bg,c); if (r >= 3 && r > bs){ best = c; bs = r; } });
  if (best) return best;
  return cr(bg,"#FFFFFF") >= cr(bg,"#121216") ? "#FFFFFF" : "#121216";
}

/* ============================ имена цветов ============================ */
const NAMES = [
["#000000","Black","Черный"],["#20252B","Graphite","Графит"],["#25252B","Charcoal","Угольный"],["#3C4350","Slate","Сланцевый"],
["#5F6B7A","Steel","Стальной"],["#808080","Gray","Серый"],["#A8ADB3","Silver","Серебристый"],["#BFC4C7","Chrome","Хром"],
["#DCE0E3","Fog","Туманный"],["#EEF0F2","Frost","Морозный"],["#FFFFFF","White","Белый"],["#F7F1E3","Ivory","Айвори"],
["#E8DCC0","Cream","Сливочный"],["#E3D3B0","Sand","Песочный"],["#D9C6A5","Beige","Бежевый"],["#C4A57B","Camel","Верблюжий"],
["#A67B5B","Caramel","Карамельный"],["#8B5E3C","Chestnut","Каштановый"],["#6B4A35","Coffee","Кофейный"],["#4A2F22","Chocolate","Шоколадный"],
["#2B1B14","Espresso","Эспрессо"],["#B7472A","Rust","Ржавый"],["#C8553D","Terracotta","Терракотовый"],["#9E3B2E","Brick","Кирпичный"],
["#B87333","Copper","Медный"],["#CD7F32","Bronze","Бронзовый"],["#D98A7C","Dusty Rose","Пыльно-розовый"],["#F4C2C2","Blush","Нежно-розовый"],
["#FFB6C1","Pink","Розовый"],["#FF69B4","Hot Pink","Ярко-розовый"],["#E0218A","Magenta","Маджента"],["#FF4D6D","Coral","Коралловый"],
["#FA8072","Salmon","Лососевый"],["#FF6B5E","Watermelon","Арбузный"],["#FF3B30","Red","Красный"],["#D62828","Scarlet","Алый"],
["#DC143C","Crimson","Кармин"],["#B3122E","Cherry","Вишневый"],["#A63D55","Raspberry","Малиновый"],["#8B1E3F","Burgundy","Бордовый"],
["#722F37","Wine","Винный"],["#4A0E17","Oxblood","Темно-бордовый"],["#FF8C42","Orange","Оранжевый"],["#FFB38A","Peach","Персиковый"],
["#FF9F5E","Apricot","Абрикосовый"],["#FFB627","Amber","Янтарный"],["#D4A017","Mustard","Горчичный"],["#E8B84A","Honey","Медовый"],
["#FFD700","Gold","Золотой"],["#FFE93B","Yellow","Желтый"],["#FFF176","Lemon","Лимонный"],["#FBE8A6","Butter","Масляный"],
["#D8FF00","Lime","Лаймовый"],["#A8E10C","Chartreuse","Салатовый"],["#BDB76B","Khaki","Хаки"],["#8A9A5B","Moss","Мшистый"],
["#596447","Olive","Оливковый"],["#9CAF88","Sage","Шалфейный"],["#BFD8A3","Pistachio","Фисташковый"],["#3F7D3A","Green","Зеленый"],
["#2D6A4F","Forest","Лесной"],["#132A13","Pine","Хвойный"],["#0FA968","Emerald","Изумрудный"],["#00A86B","Jade","Нефритовый"],
["#7FE5B0","Mint","Мятный"],["#9FE2BF","Seafoam","Светло-мятный"],["#2A9D8F","Teal","Морская волна"],["#1FC2B8","Turquoise","Бирюзовый"],
["#528A9A","Steel Teal","Серо-бирюзовый"],["#00D4E0","Aqua","Аква"],["#00B4D8","Cyan","Циан"],["#87CEEB","Sky","Небесный"],
["#B8D8E8","Powder Blue","Пудрово-голубой"],["#D9E7E8","Ice","Ледяной"],["#6495ED","Cornflower","Васильковый"],["#3A86FF","Azure","Лазурный"],
["#2F6BFF","Blue","Синий"],["#0047AB","Cobalt","Кобальтовый"],["#3A506B","Denim","Джинсовый"],["#1C2541","Navy","Темно-синий"],
["#0B132B","Midnight","Полночный"],["#24104F","Indigo","Индиго"],["#4B3FA0","Ultramarine","Ультрамарин"],["#7027FF","Violet","Фиолетовый"],
["#7457FF","Electric","Электрик"],["#8179A8","Mauve","Лиловый"],["#B9A7E6","Lavender","Лавандовый"],["#C8A2C8","Lilac","Сиреневый"],
["#DA70D6","Orchid","Орхидея"],["#800080","Purple","Пурпурный"],["#6F2DA8","Grape","Виноградный"],["#5E2750","Plum","Сливовый"],
["#2E1A47","Aubergine","Баклажановый"]
].map(n => ({ lab: oklab(n[0]), en: n[1], ru: n[2] }));

// точное имя из таблицы берём только если оно реально близко; иначе строим имя по правилам
// (оттенок + светлота + насыщенность), чтобы «Ультрамарин» не прилетал на пыльно-фиолетовый
const wdist = (a,b) => Math.hypot((a[0]-b[0])*.9, (a[1]-b[1])*1.6, (a[2]-b[2])*1.6);
const HUES = [[27,"Red","Красный"],[55,"Orange","Оранжевый"],[82,"Amber","Янтарный"],[104,"Yellow","Желтый"],[128,"Lime","Салатовый"],
  [148,"Green","Зеленый"],[183,"Teal","Бирюзовый"],[212,"Cyan","Голубой"],[257,"Blue","Синий"],[291,"Violet","Фиолетовый"],[326,"Purple","Пурпурный"],[356,"Pink","Розовый"]];
const MODS = { dark:["Dark ","Темно-"], light:["Light ","Светло-"], pale:["Pale ","Бледно-"], dusty:["Dusty ","Пыльно-"] };
function ruleName(lab, key){
  const L = lab[0], C = chroma(lab); let h = Math.atan2(lab[2], lab[1])*180/Math.PI; if (h < 0) h += 360;
  if (C < .03) return key === "ru" ? (L < .2 ? "Черный" : L < .4 ? "Темно-серый" : L > .8 ? "Светло-серый" : "Серый") : (L < .2 ? "Black" : L < .4 ? "Dark Gray" : L > .8 ? "Light Gray" : "Gray");
  let base;
  if (h > 20 && h < 85 && L < .64 && C < .15) base = ["", "Brown", "Коричневый"];
  else base = HUES.map(x => ({ x, d: Math.min(Math.abs(h-x[0]), 360-Math.abs(h-x[0])) })).sort((p,q) => p.d - q.d)[0].x;
  const mod = L < .32 ? "dark" : L > .88 ? "pale" : L > .77 ? "light" : (C < .075 ? "dusty" : "");
  const name = key === "ru" ? base[2] : base[1];
  if (!mod) return name;
  return key === "ru" ? MODS[mod][1] + name.charAt(0).toLowerCase() + name.slice(1) : MODS[mod][0] + name;
}
function nameColors(pal, lg){
  const key = lg === "ru" ? "ru" : "en";
  const info = pal.map(c => {
    const lab = oklab(c);
    const ranked = NAMES.map(n => ({ n, d: wdist(lab, n.lab) })).sort((a,b) => a.d - b.d);
    const cands = ranked.filter(r => r.d < .075).slice(0,4).map(r => r.n[key]);
    cands.push(ruleName(lab, key));
    return { cands, best: ranked[0].d, fallback: ranked.slice(0,6).map(r => r.n[key]) };
  });
  const order = pal.map((_,i) => i).sort((a,b) => info[a].best - info[b].best);
  const used = new Set(), out = [];
  order.forEach(i => {
    const pick = info[i].cands.find(n => !used.has(n)) || info[i].fallback.find(n => !used.has(n)) || info[i].cands[0];
    used.add(pick); out[i] = pick;
  });
  return out;
}

/* ============================ состояние ============================ */
const MOODS = ["balanced","calm","warm","fresh","moody","elegant","playful"];
const MOOD_W = { playful:.24, balanced:.18, fresh:.13, warm:.13, moody:.12, calm:.10, elegant:.10 };
const HARMONIES = ["free","free","free","analogous","complementary","triadic","split"];

let B = null;                       // мост в app.js
let prefs = { mood:"", n:0 };       // "" / 0 = любое
try { Object.assign(prefs, JSON.parse(localStorage.getItem(LS_PREFS) || "{}")); } catch {}
const items = [];                   // уже показанные + буфер вперёд
const seen = new Set();
let cur = 0, isOpen = false, pushed = false, afterPop = null, lastFocus = null;
let swipes = 0, built = false, seenHint = false;
try { seenHint = localStorage.getItem(LS_SEEN) === "1"; } catch {}
let els = {};

const $ = id => document.getElementById(id);
const esc = s => String(s || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
const rnd = a => a[Math.floor(Math.random()*a.length)];
const pad = n => String(n).padStart(2,"0");
const L = () => (B ? B.lang() : "en");

/* ============================ подбор палитр ============================ */
function feedScore(p){
  const labs = p.map(oklab), Ls = labs.map(x => x[0]);
  const spread = Math.max(...Ls) - Math.min(...Ls);
  const maxC = Math.max(...labs.map(chroma));
  let minD = 9;
  for (let i = 0; i < labs.length; i++) for (let j = i+1; j < labs.length; j++) minD = Math.min(minD, dist(labs[i], labs[j]));
  return spread*2 + Math.min(maxC,.22)*3.5 + Math.min(minD,.28)*2;
}
function wpick(w){ let r = Math.random(), s = 0; for (const k in w){ s += w[k]; if (r <= s) return k; } return Object.keys(w)[0]; }
function pickCount(){ if (prefs.n) return prefs.n; const r = Math.random(); return r < .62 ? 3 : r < .82 ? 4 : 5; }
function shuffle(a){ a = a.slice(); for (let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

function fromGenerator(){
  const n = pickCount(), mood = prefs.mood || wpick(MOOD_W);
  let best = null, bs = -1;
  for (let k = 0; k < 6; k++){
    const p = B.generate({ n, mood, harmony: rnd(HARMONIES) }).map(c => c.toUpperCase());
    const s = feedScore(p) + Math.random()*.2;
    if (s > bs){ bs = s; best = p; }
  }
  return { src:"gen", colors: shuffle(best), mood, seed: B.newSeed() };
}
function bestSubset(cols, n){
  if (n >= cols.length) return cols.slice();
  let best = null, bs = -1;
  (function rec(start, pick){
    if (pick.length === n){ const p = pick.map(i => cols[i]); const s = feedScore(p); if (s > bs){ bs = s; best = p; } return; }
    for (let i = start; i < cols.length; i++) rec(i+1, pick.concat(i));
  })(0, []);
  return best;
}
function fromLibrary(){
  const lib = B.library().filter(p => p.colors && p.colors.length >= 3);
  if (!lib.length) return null;
  const p = rnd(lib), n = pickCount();
  let cols = bestSubset(p.colors.map(c => c.toUpperCase()), n);
  if (Math.random() < .5) cols = cols.slice().reverse();
  return { src:"lib", colors: cols, libName: p.name, seed: B.newSeed() };
}
function nextItem(){
  for (let t = 0; t < 14; t++){
    const it = (!prefs.mood && Math.random() < .28 ? fromLibrary() : null) || fromGenerator();
    const k = it.colors.join("-");
    if (seen.has(k)) continue;
    seen.add(k); return it;
  }
  const it = fromGenerator(); seen.add(it.colors.join("-")); return it;
}
const nameOf = it => it.src === "lib" ? it.libName : B.nameFor(it.colors, it.seed);
const namesOf = it => nameColors(it.colors, L());
const linkFor = it => location.origin + location.pathname + "?p=" + it.colors.map(c => c.slice(1)).join("-");

/* ============================ иконки ============================ */
const I = {
  close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  tune:'<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.6 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.4 0 5.4 3.3 4.2 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z"/></svg>',
  share:'<svg viewBox="0 0 24 24"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  copy:'<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
  more:'<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/></svg>',
  apply:'<svg viewBox="0 0 24 24"><path d="m5 12.5 4.1 4.1L19 7"/></svg>',
  up:'<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  chevUp:'<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
  hash:'<svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/></svg>',
  code:'<svg viewBox="0 0 24 24"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>',
  link:'<svg viewBox="0 0 24 24"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
  image:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="M21 15l-5-5L5 21"/></svg>',
  studio:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 10v10"/></svg>',
  bigHeart:'<svg viewBox="0 0 24 24"><path d="M12 21s-8-4.9-9.8-9.9C1 7.4 3.1 4 6.8 4c2.2 0 3.9 1.2 5.2 3.2C13.3 5.2 15 4 17.2 4c3.7 0 5.8 3.4 4.6 7.1C20 16.1 12 21 12 21Z"/></svg>'
};

/* ============================ DOM ============================ */
function build(){
  if (built) return; built = true;
  const root = document.createElement("div");
  root.className = "feed"; root.id = "feed"; root.setAttribute("role","dialog"); root.setAttribute("aria-modal","true");
  root.innerHTML =
    '<div class="feed-glow" id="fGlow"></div>' +
    '<div class="feed-stage" id="fStage">' +
      '<div class="feed-scroll" id="fScroll"></div>' +
      '<button type="button" class="fbtn fclose" data-act="close" data-fk="feedClose">' + I.close + '</button>' +
      '<button type="button" class="fbtn ftune" data-act="tune" data-fk="feedTune">' + I.tune + '</button>' +
      '<div class="frail" id="fRail">' +
        '<button type="button" class="fact" data-act="like" id="fLike" data-fk="feedLike" aria-pressed="false"><span class="fact-ic">' + I.heart + '</span></button>' +
        '<button type="button" class="fact" data-act="share" data-fk="feedShare"><span class="fact-ic">' + I.share + '</span></button>' +
        '<button type="button" class="fact" data-act="copy" data-fk="feedCopy"><span class="fact-ic">' + I.copy + '</span></button>' +
        '<button type="button" class="fact" data-act="more" data-fk="feedMore"><span class="fact-ic">' + I.more + '</span></button>' +
      '</div>' +
      '<button type="button" class="fapply" data-act="apply">' + I.apply + '<span data-fk-text="feedApply"></span></button>' +
      '<div class="ftoast" id="fToast" role="status" aria-live="polite"></div>' +
      '<div class="fsheet-wrap" id="fSheetWrap"><div class="fsheet" id="fSheet" role="dialog" aria-modal="true"></div></div>' +
    '</div>' +
    '<div class="feed-nav"><button type="button" data-act="prev" data-fk="feedPrev">' + I.chevUp + '</button><button type="button" data-act="next" data-fk="feedNext">' + I.down + '</button></div>';
  document.body.appendChild(root);
  els = { root, stage: $("fStage"), scroll: $("fScroll"), rail: $("fRail"), like: $("fLike"), toast: $("fToast"), glow: $("fGlow"), sheetWrap: $("fSheetWrap"), sheet: $("fSheet") };
  relabel();
  bind();
}
function relabel(){
  if (!built) return;
  els.root.querySelectorAll("[data-fk]").forEach(el => { const s = t(el.dataset.fk); el.setAttribute("aria-label", s); el.title = s; });
  els.root.querySelectorAll("[data-fk-text]").forEach(el => { el.textContent = t(el.dataset.fkText); });
  els.root.setAttribute("aria-label", t("feedBtnTitle"));
}

function cardHTML(it, i){
  const names = namesOf(it), n = it.colors.length;
  const bands = it.colors.map((c,k) =>
    '<div class="fband" style="background:' + c + ';color:' + textFor(k, it.colors) + ';--k:' + k + '">' +
      '<div class="fname"><span>' + esc(names[k]) + '</span></div>' +
      '<button type="button" class="fhex" data-hex="' + c + '">' + c + '</button>' +
    '</div>').join("");
  const top = textFor(0, it.colors), bot = textFor(n-1, it.colors);
  return '<article class="fcard" data-i="' + i + '" style="--n:' + n + '"><div class="fbands">' + bands + '</div>' +
    '<div class="ftop" style="color:' + top + '"><span>@colorlette</span><span class="fcount">' + pad(i+1) + '\\∞</span></div>' +
    '<div class="fswipe" style="color:' + bot + '">Swipe ' + I.up + '</div></article>';
}
function appendCard(it, i){
  const tpl = document.createElement("template");
  tpl.innerHTML = cardHTML(it, i).trim();
  const card = tpl.content.firstChild;
  els.scroll.appendChild(card);
  io.observe(card);
  if (isOpen) requestAnimationFrame(() => fitCard(card));
  return card;
}
function ensure(upTo){
  while (items.length <= upTo && items.length < 600){
    const it = nextItem(); items.push(it);
    if (built) appendCard(it, items.length - 1);
  }
}

/* подгонка размера названия под ширину; плашки рядом с правой колонкой кнопок чуть уже */
function fitCard(card){
  const W = card.clientWidth; if (!W) return;
  const H = card.clientHeight;
  const rail = els.rail.getBoundingClientRect(), st = els.stage.getBoundingClientRect();
  const rL = rail.left - st.left, rT = rail.top - st.top, rB = rail.bottom - st.top;
  const bands = card.querySelectorAll(".fband");
  bands.forEach((b,k) => {
    const sp = b.querySelector(".fname span"), bh = H / bands.length;
    sp.style.fontSize = "100px";
    const w100 = sp.getBoundingClientRect().width || 100;
    let size = Math.min(bh*.38, W*.19, W*.88/w100*100);
    const cy = k*bh + bh/2, half = size*.55 + 26;
    if (cy + half > rT && cy - half < rB) size = Math.min(size, 2*(rL - 10 - W/2)/w100*100);
    sp.style.fontSize = Math.max(18, size).toFixed(1) + "px";
  });
  card.classList.add("fit");
}
function fitAll(){ els.scroll.querySelectorAll(".fcard").forEach(fitCard); }
function renameAll(){
  els.scroll.querySelectorAll(".fcard").forEach(card => {
    const it = items[+card.dataset.i]; if (!it) return;
    const names = namesOf(it);
    card.querySelectorAll(".fname span").forEach((sp,k) => { sp.textContent = names[k]; });
  });
  fitAll();
}

/* ============================ активная карточка ============================ */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting && e.intersectionRatio >= .6) activate(+e.target.dataset.i); });
}, { root: null, threshold: [.6] });

function activate(i){
  if (i === cur && els.scroll.querySelector(".fcard.is-active")) return;
  const moved = i !== cur;
  cur = i;
  els.scroll.querySelectorAll(".fcard.is-active").forEach(c => c.classList.remove("is-active"));
  const card = els.scroll.children[i]; if (card) card.classList.add("is-active");
  const it = items[i]; if (!it) return;
  ensure(i + 6);
  const vivid = it.colors.map(c => ({ c, v: chroma(oklab(c)) })).sort((a,b) => b.v - a.v)[0].c;
  els.glow.style.setProperty("--glow", vivid);
  syncLike(false);
  syncNav();
  if (moved){
    haptic("sel");
    if (++swipes >= 3 && !els.stage.classList.contains("seen")){ els.stage.classList.add("seen"); try { localStorage.setItem(LS_SEEN,"1"); } catch {} }
  }
}
function syncNav(){
  const p = els.root.querySelector('[data-act="prev"]'); if (p) p.disabled = cur <= 0;
}
function syncLike(animate){
  const it = items[cur]; if (!it) return;
  const on = B.isLiked(it.colors);
  els.like.classList.toggle("on", on);
  els.like.setAttribute("aria-pressed", on);
  if (animate){ els.like.classList.remove("pop"); void els.like.offsetWidth; els.like.classList.add("pop"); }
}
function go(d){
  const target = Math.max(0, Math.min(items.length - 1, cur + d));
  if (d > 0) ensure(target + 2);
  els.scroll.scrollTo({ top: target * els.scroll.clientHeight, behavior: "smooth" });
}
function snapTo(i){ els.scroll.style.scrollBehavior = "auto"; els.scroll.scrollTop = i * els.scroll.clientHeight; els.scroll.style.scrollBehavior = ""; }

/* ============================ действия ============================ */
let toastTimer = 0;
function toast(msg, sw, action){
  const el = els.toast; clearTimeout(toastTimer);
  el.innerHTML = (sw ? '<span class="sw" style="background:' + sw + '"></span>' : "") + "<span>" + esc(msg) + "</span>";
  if (action){
    const b = document.createElement("button"); b.type = "button"; b.textContent = action.label;
    b.addEventListener("click", () => { el.classList.remove("show"); action.fn(); });
    el.appendChild(b);
  }
  el.classList.add("show");
  toastTimer = setTimeout(() => el.classList.remove("show"), action ? 4200 : 1700);
}
function haptic(kind){
  try {
    const h = tg && tg.HapticFeedback;
    if (h){ if (kind === "sel") h.selectionChanged(); else if (kind === "ok") h.notificationOccurred("success"); else h.impactOccurred("light"); return; }
    if (kind === "ok" && navigator.vibrate) navigator.vibrate(12);
  } catch {}
}
async function copyText(s){
  try { if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(s); else throw 0; }
  catch { const ta = document.createElement("textarea"); ta.value = s; ta.style.cssText = "position:fixed;opacity:0"; els.stage.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); }
}

function burst(x, y, it){
  const r = els.stage.getBoundingClientRect(), b = document.createElement("div");
  b.className = "fburst"; b.style.left = (x - r.left) + "px"; b.style.top = (y - r.top) + "px";
  let h = I.bigHeart;
  it.colors.forEach((c,k) => {
    const a = (k / it.colors.length) * Math.PI * 2 + Math.random()*.6, d = 70 + Math.random()*40;
    h += '<i style="--c:' + c + ';--dx:' + Math.cos(a)*d + 'px;--dy:' + Math.sin(a)*d + 'px"></i>';
  });
  b.innerHTML = h; els.stage.appendChild(b);
  setTimeout(() => b.remove(), 950);
}
function likeIt(it){
  B.like({ colors: it.colors, name: nameOf(it), auto: it.src === "gen", seed: it.seed });
  haptic("ok"); toast(t("feedToastLiked"));
}
function toggleLike(){
  const it = items[cur]; if (!it) return;
  if (B.isLiked(it.colors)){ B.unlike(it.colors); toast(t("feedToastUnliked")); } else likeIt(it);
  syncLike(true);
}
function copyHex(btn){
  copyText(btn.dataset.hex); haptic();
  btn.classList.add("copied"); setTimeout(() => btn.classList.remove("copied"), 500);
  toast(t("feedToastHex").replace("{v}", btn.dataset.hex), btn.dataset.hex);
}
function applyIt(view){
  const it = items[cur]; if (!it) return;
  const p = { colors: it.colors, name: nameOf(it), auto: it.src === "gen", seed: it.seed };
  haptic("ok");
  leave(() => B.apply(p, view));
}

/* ----- картинка-карточка (как референс, 1080×1440) ----- */
async function imageBlob(it){
  try { await Promise.all([document.fonts.load("700 100px Oswald"), document.fonts.load("500 30px Montserrat"), document.fonts.load("500 30px Inter")]); } catch {}
  const W = 1080, H = 1440, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), n = it.colors.length, bh = H / n, names = namesOf(it);
  it.colors.forEach((c,k) => {
    g.fillStyle = c; g.fillRect(0, Math.floor(k*bh), W, Math.ceil(bh)+1);
    const tx = textFor(k, it.colors); g.fillStyle = tx; g.textAlign = "center"; g.textBaseline = "alphabetic";
    const label = names[k].toUpperCase(), fam = 'Oswald,"Arial Narrow",Impact,sans-serif';
    let size = Math.min(bh*.38, W*.2);
    g.font = "700 " + size + "px " + fam;
    const w = g.measureText(label).width; if (w > W*.86){ size *= W*.86/w; g.font = "700 " + size + "px " + fam; }
    const cap = g.measureText("H").actualBoundingBoxAscent || size*.8;
    const hs = Math.max(30, Math.min(44, size*.28)), gap = size*.16, total = cap + gap + hs*.72, top = Math.max(k*bh + bh/2 - total/2, k === 0 ? 125 : 0);
    g.fillText(label, W/2, top + cap);
    g.font = "500 " + hs + "px Montserrat,Inter,sans-serif"; g.fillText(c, W/2, top + cap + gap + hs*.72);
  });
  const tc = textFor(0, it.colors);
  g.fillStyle = tc; g.font = "500 30px Inter,sans-serif"; g.textAlign = "left"; g.fillText("@COLORLETTE", 54, 78);
  g.textAlign = "right"; g.font = "500 40px Montserrat,Inter,sans-serif"; g.fillText("the colorlette°", W - 54, 80);
  return new Promise(res => cv.toBlob(res, "image/png"));
}
let imgBlob = null;
const blobToDataUrl = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(""); r.readAsDataURL(blob); });
async function saveImage(it){
  const blob = await imageBlob(it); if (!blob) return;
  // в Telegram Mini App скачивание через <a download> не работает — показываем картинку для долгого нажатия
  // и даём системный шеринг / копирование
  if (tg && tg.initData){ imgBlob = blob; openSheet("img", await blobToDataUrl(blob)); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "colorlette-" + it.colors.map(c => c.slice(1)).join("-").toLowerCase() + ".png";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(t("feedToastImage"));
}
async function share(){
  const it = items[cur]; if (!it) return;
  const url = linkFor(it), name = nameOf(it), text = t("feedShareText").replace("{name}", name);
  if (tg && tg.initData && tg.openTelegramLink){
    tg.openTelegramLink("https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text)); return;
  }
  if (navigator.share){
    try {
      const blob = await imageBlob(it), file = new File([blob], "colorlette-palette.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], title: name, text: text + " " + url }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.share({ title: name, text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  openSheet("more");
}

/* ============================ шторки ============================ */
let sheetKind = "";
function openSheet(kind, extra){
  const it = items[cur]; if (!it) return;
  sheetKind = kind;
  let h = '<div class="fgrab" id="fGrab"></div>';
  if (kind === "more"){
    const names = namesOf(it);
    h += '<div class="fs-title">' + esc(nameOf(it)) + '</div><div class="fs-sub">' + esc(names.join(" · ")) + '</div>' +
      '<div class="fs-strip">' + it.colors.map(c => '<div style="background:' + c + '"></div>').join("") + '</div>' +
      '<div class="fs-list">' +
        row("hex", I.hash, t("feedMoreHex")) + row("css", I.code, t("feedMoreCss")) + row("link", I.link, t("feedMoreLink")) + row("img", I.image, t("feedMoreImage")) +
      '</div><div class="fs-label">' + esc(t("feedOpenIn")) + '</div><div class="fs-chips">' +
        [["shades","tabShades"],["gradient","tabGradient"],["contrast","tabContrast"],["preview","tabPreview"]].map(v => '<button type="button" class="fchip" data-open="' + v[0] + '">' + esc(t(v[1])) + '</button>').join("") +
      '</div>';
  } else if (kind === "img"){
    h += '<div class="fs-title">' + esc(t("feedImgTitle")) + '</div><div class="fs-sub">' + esc(t("feedImgHint")) + '</div>' +
      '<img class="fs-img" alt="" src="' + extra + '">' +
      '<div class="fs-list">' + row("imgshare", I.share, t("feedImgShare")) + row("imgcopy", I.copy, t("feedImgCopy")) + '</div>';
  } else {
    h += '<div class="fs-title">' + esc(t("feedTuneTitle")) + '</div><div class="fs-sub">' + esc(t("feedTuneSub")) + '</div>' +
      '<div class="fs-label">' + esc(t("feedMood")) + '</div><div class="fs-chips">' +
        chip("mood", "", t("feedAny"), !prefs.mood) +
        MOODS.map(m => chip("mood", m, t("mood" + m[0].toUpperCase() + m.slice(1)), prefs.mood === m)).join("") +
      '</div><div class="fs-label">' + esc(t("feedCount")) + '</div><div class="fs-chips">' +
        chip("n", 0, t("feedMix"), !prefs.n) + [3,4,5,6].map(n => chip("n", n, n, prefs.n === n)).join("") + '</div>';
  }
  els.sheet.innerHTML = h;
  els.sheet.setAttribute("aria-label", t("feedSheetLabel"));
  els.sheetWrap.classList.add("open");
  bindGrab();
}
const row = (id, ic, label) => '<button type="button" class="fs-row" data-row="' + id + '">' + ic + '<span>' + esc(label) + '</span></button>';
const chip = (k, v, label, on) => '<button type="button" class="fchip' + (on ? " on" : "") + '" data-pref="' + k + '" data-v="' + v + '">' + esc(label) + '</button>';
function closeSheet(){ sheetKind = ""; imgBlob = null; els.sheetWrap.classList.remove("open"); els.sheet.style.transform = ""; }

function bindGrab(){
  const grab = $("fGrab"); let y0 = null, dy = 0;
  grab.addEventListener("pointerdown", e => { y0 = e.clientY; dy = 0; grab.setPointerCapture(e.pointerId); els.sheet.classList.add("dragging"); });
  grab.addEventListener("pointermove", e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); els.sheet.style.transform = "translateY(" + dy + "px)"; });
  const end = () => { if (y0 == null) return; y0 = null; els.sheet.classList.remove("dragging"); if (dy > 90) closeSheet(); else els.sheet.style.transform = ""; };
  grab.addEventListener("pointerup", end); grab.addEventListener("pointercancel", end);
}
function sheetClick(e){
  const r = e.target.closest("[data-row]");
  if (r){
    const it = items[cur], id = r.dataset.row;
    if (id === "imgshare"){
      const file = new File([imgBlob], "colorlette-palette.png", { type: "image/png" });
      (async () => { try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] }); else toast(t("feedImgHint")); } catch {} })();
      return;
    }
    if (id === "imgcopy"){
      (async () => { try { await navigator.clipboard.write([new ClipboardItem({ "image/png": imgBlob })]); toast(t("feedToastImgCopied")); } catch { toast(t("feedImgHint")); } })();
      return;
    }
    if (id === "hex"){ copyText(it.colors.join(", ")); toast(t("toastCopied")); }
    if (id === "css"){ copyText(":root{\n" + it.colors.map((c,i) => "  --color-" + (i+1) + ": " + c + ";").join("\n") + "\n}"); toast(t("toastCopied")); }
    if (id === "link"){ copyText(linkFor(it)); toast(t("toastCopied")); }
    if (id === "img"){ saveImage(it); }
    closeSheet(); return;
  }
  const o = e.target.closest("[data-open]");
  if (o){ closeSheet(); applyIt(o.dataset.open); return; }
  const c = e.target.closest("[data-pref]");
  if (c){
    const k = c.dataset.pref; prefs[k] = k === "n" ? +c.dataset.v : c.dataset.v;
    try { localStorage.setItem(LS_PREFS, JSON.stringify(prefs)); } catch {}
    rebuildUpcoming(); openSheet("tune"); toast(t("feedToastTuned"));
  }
}
function rebuildUpcoming(){
  while (items.length > cur + 1){ items.pop(); const c = els.scroll.lastElementChild; if (c){ io.unobserve(c); c.remove(); } }
  ensure(cur + 6);
}

/* ============================ ввод ============================ */
function bind(){
  els.root.addEventListener("click", e => {
    const hexBtn = e.target.closest(".fhex"); if (hexBtn){ copyHex(hexBtn); return; }
    if (e.target.closest(".fsheet")){ sheetClick(e); return; }
    if (e.target === els.sheetWrap){ closeSheet(); return; }
    const b = e.target.closest("[data-act]"); if (!b) return;
    switch (b.dataset.act){
      case "close": leave(); break;
      case "like": toggleLike(); break;
      case "apply": applyIt(); break;
      case "share": share(); break;
      case "copy": { const it = items[cur]; copyText(it.colors.join(", ")); haptic(); toast(t("toastCopied")); break; }
      case "more": openSheet("more"); break;
      case "tune": openSheet("tune"); break;
      case "next": go(1); break;
      case "prev": go(-1); break;
    }
  });

  // двойной тап = лайк (как в соцсетях)
  let down = null, last = { t: 0, x: 0, y: 0 };
  els.scroll.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  els.scroll.addEventListener("pointercancel", () => { down = null; });
  els.scroll.addEventListener("pointerup", e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
    if (moved > 12 || dt > 350 || e.target.closest("button")) return;
    const now = performance.now();
    if (now - last.t < 320 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 56){
      last.t = 0;
      const it = items[cur]; if (!it) return;
      burst(e.clientX, e.clientY, it);
      if (!B.isLiked(it.colors)) likeIt(it);
      syncLike(true);
    } else last = { t: now, x: e.clientX, y: e.clientY };
  });

  // колесо мыши: один «шаг» на жест, без перелёта через пять палитр
  let lockUntil = 0;
  els.scroll.addEventListener("wheel", e => {
    e.preventDefault();
    const now = performance.now();
    if (now < lockUntil){ lockUntil = Math.max(lockUntil, now + 140); return; }
    if (Math.abs(e.deltaY) < 6) return;
    go(e.deltaY > 0 ? 1 : -1); lockUntil = now + 560;
  }, { passive: false });

  // ресайз/поворот экрана: перепривязать позицию и пересчитать шрифты
  let rt = 0;
  new ResizeObserver(() => { if (!isOpen) return; clearTimeout(rt); rt = setTimeout(() => { fitAll(); snapTo(cur); }, 120); }).observe(els.stage);
  if (document.fonts) document.fonts.addEventListener("loadingdone", () => { if (isOpen) fitAll(); });
}

window.addEventListener("keydown", e => {
  if (!isOpen || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key; let used = true;
  if (k === "Escape"){ if (sheetKind) closeSheet(); else leave(); }
  else if (sheetKind){ used = false; }
  else if (k === "ArrowDown" || k === "PageDown" || k === " " || k === "j") go(1);
  else if (k === "ArrowUp" || k === "PageUp" || k === "k") go(-1);
  else if (k === "l" || k === "L") toggleLike();
  else if (k === "a" || k === "A") applyIt();
  else if (k === "s" || k === "S") share();
  else if (k === "m" || k === "M") openSheet("more");
  else if (k === "c" || k === "C"){ copyText(items[cur].colors.join(", ")); toast(t("toastCopied")); }
  else used = false;
  if (used){ e.preventDefault(); e.stopImmediatePropagation(); }
  else if (k === " " || k === "Enter") e.stopImmediatePropagation(); // пробел в студии = «новая палитра», не отдаём
}, true);

/* ============================ открыть / закрыть ============================ */
const GUARD = "header,main,footer,.marquee-section";
const onTgBack = () => leave();
function open(){
  if (isOpen || !B) return;
  build();
  isOpen = true; lastFocus = document.activeElement;
  document.documentElement.classList.add("feed-lock");
  document.querySelectorAll(GUARD).forEach(n => n.setAttribute("inert", ""));
  els.stage.classList.toggle("seen", seenHint);
  if (!items.length) ensure(7);
  else if (!els.scroll.children.length) items.forEach((it,i) => appendCard(it, i));
  els.root.classList.remove("closing"); els.root.classList.add("open");
  try { window.history.pushState({ colFeed: 1 }, "", location.href); pushed = true; } catch { pushed = false; }
  try { if (tg){ tg.BackButton.show(); tg.BackButton.onClick(onTgBack); if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); } } catch {}
  requestAnimationFrame(() => {
    fitAll(); snapTo(cur);
    els.scroll.querySelectorAll(".fcard.is-active").forEach(c => c.classList.remove("is-active"));
    activate(cur);
    els.root.querySelector(".fclose").focus({ preventScroll: true });
  });
  let first = true; try { first = !localStorage.getItem(LS_VISITED); localStorage.setItem(LS_VISITED, "1"); } catch {}
  document.querySelectorAll(".feed-dot").forEach(d => d.remove());
  if (first) setTimeout(() => { if (isOpen) toast(t("feedCoach")); }, 900);
}
function teardown(){
  if (!isOpen) return;
  isOpen = false; closeSheet();
  els.root.classList.remove("open"); els.root.classList.add("closing");
  setTimeout(() => { if (!isOpen) els.root.classList.remove("closing"); }, 230);
  document.documentElement.classList.remove("feed-lock");
  document.querySelectorAll(GUARD).forEach(n => n.removeAttribute("inert"));
  try { if (tg){ tg.BackButton.offClick(onTgBack); tg.BackButton.hide(); if (tg.enableVerticalSwipes) tg.enableVerticalSwipes(); } } catch {}
  try { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch {}
}
// закрыть и, когда браузерная «назад»-запись снята и URL снова актуален, выполнить fn
function leave(fn){
  if (!isOpen){ if (fn) fn(); return; }
  teardown();
  if (pushed){
    pushed = false; afterPop = fn || null;
    window.history.back();
    setTimeout(() => { if (afterPop){ const f = afterPop; afterPop = null; f(); } }, 300);
  } else if (fn) fn();
}
window.addEventListener("popstate", () => {
  if (afterPop){ const f = afterPop; afterPop = null; f(); }
  else if (isOpen){ pushed = false; teardown(); }
});

/* ============================ init ============================ */
window.ColoretteFeed = {
  init(bridge){
    B = bridge;
    ["feedBtn","feedCta"].forEach(id => { const b = $(id); if (b) b.addEventListener("click", open); });
    const ls = $("langSelect");
    if (ls) ls.addEventListener("change", () => { relabel(); if (built){ closeSheet(); renameAll(); } });
    if (wantOpen) setTimeout(open, 60);
  },
  open
};
})();
