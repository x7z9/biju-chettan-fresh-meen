import { resolvePublicAsset } from '../data/seedCatalog';
import type {
  CustomerSnapshotV1,
  DailyRecord,
  FishItem,
} from '../types';

export interface HtmlExportOptions {
  includePhotos: boolean;
  fishList: FishItem[];
  dailyRecord: DailyRecord;
}

export interface GeneratedHtmlResult {
  html: string;
  sizeBytes: number;
  sizeFormatted: string;
  exceedsSoftWarn: boolean; // > 3 MB
  exceedsHardWarn: boolean; // > 5 MB
}

function escapeJsonForHtmlScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeHtmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function createCompactThumbnailDataUrl(src: string): Promise<string | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  try {
    const resolved = src.startsWith('data:') ? src : resolvePublicAsset(src);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load failed'));
      el.src = resolved;
    });
    const maxDim = 420;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.68);
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function generateStandaloneCustomerHtml(
  snapshot: CustomerSnapshotV1,
  options: HtmlExportOptions
): Promise<GeneratedHtmlResult> {
  const embeddedThumbs: Record<string, string> = {};
  if (options.includePhotos) {
    const byId = new Map(options.fishList.map((f) => [f.id, f]));
    await Promise.all(
      snapshot.items.map(async (item) => {
        const fish = byId.get(item.id);
        const entry = options.dailyRecord.entries[item.id];
        const rawSrc =
          entry?.todayPosterDataUrl ||
          entry?.todayPhotoDataUrl ||
          fish?.customActualPhotos[0]?.dataUrl ||
          fish?.referenceImage ||
          null;
        if (!rawSrc) return;
        const compact = await createCompactThumbnailDataUrl(rawSrc);
        if (compact) embeddedThumbs[item.id] = compact;
      })
    );
  }

  const embeddedPayload = {
    snapshot,
    thumbs: embeddedThumbs,
  };

  const titleSafe = escapeHtmlText(
    snapshot.lang === 'en' ? snapshot.businessEn : snapshot.businessMl
  );
  const safeJson = escapeJsonForHtmlScript(embeddedPayload);

  const html = `<!doctype html>
<html lang="${snapshot.lang === 'en' ? 'en' : 'ml'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>${titleSafe} — ${escapeHtmlText(snapshot.dateKey)}</title>
<style>
  :root{--navy:#082d59;--blue:#0879d9;--bg:#f5f8fc;--card:#ffffff;--ink:#0f172a;--muted:#475569;--border:#e2e8f0}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,"Noto Sans Malayalam",sans-serif;background:var(--bg);color:var(--ink);line-height:1.45;padding-bottom:84px}
  header{background:var(--navy);color:#fff;padding:16px}
  header h1{margin:0;font-size:1.2rem}
  header p{margin:4px 0 0;font-size:.85rem;color:#bae6fd}
  .wrap{max-width:960px;margin:0 auto;padding:12px}
  .notice{background:#fef3c7;color:#78350f;border:1px solid #fde68a;border-radius:14px;padding:10px 12px;font-size:.82rem;margin-bottom:12px}
  .controls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
  .controls input{flex:1 1 200px;min-height:42px;padding:8px 12px;border-radius:12px;border:1px solid #cbd5e1;font-size:.95rem;background:#fff}
  .tabs{display:flex;flex-wrap:wrap;gap:6px}
  .tab{min-height:40px;padding:6px 12px;border-radius:12px;border:1px solid var(--border);background:#fff;font-weight:700;font-size:.8rem;cursor:pointer;color:var(--ink)}
  .tab.active{background:var(--navy);color:#fff;border-color:var(--navy)}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
  .card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:12px;display:flex;flex-direction:column;justify-content:space-between;gap:8px}
  .card.limited{border-color:#f59e0b;background:#fffbeb}
  .card.sold_out{opacity:.65}
  .thumb{width:100%;aspect-ratio:3/4;border-radius:12px;object-fit:contain;background:#f8fafc;border:1px solid var(--border)}
  .status{font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.02em}
  .status.available{color:#047857}
  .status.limited{color:#b45309}
  .status.sold_out{color:#be123c}
  .title{margin:2px 0 0;font-size:1.05rem;font-weight:800}
  .sub{margin:2px 0 0;font-size:.82rem;color:var(--muted)}
  .price{margin:6px 0 0;font-size:.95rem;font-weight:800;color:var(--navy)}
  .meta{margin:4px 0 0;font-size:.8rem;color:#334155}
  .btn-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .btn{flex:1 1 auto;min-height:40px;padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:#f0f9ff;color:var(--navy);font-weight:700;font-size:.78rem;text-decoration:none;text-align:center;cursor:pointer}
  .bar{position:fixed;bottom:0;left:0;right:0;background:rgba(255,255,255,.96);border-top:1px solid var(--border);padding:10px 12px;display:flex;gap:8px;justify-content:center;backdrop-filter:blur(8px)}
  .cta{flex:1;max-width:220px;min-height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;text-decoration:none;border:none;cursor:pointer}
  .cta.call{background:var(--navy);color:#fff}
  .cta.wa{background:#059669;color:#fff}
  @media print{.bar,.controls{display:none!important}body{padding-bottom:0}}
</style>
</head>
<body>
<header id="hdr"></header>
<main class="wrap">
  <div id="notice" class="notice"></div>
  <div class="controls">
    <input id="search" type="search" />
    <div id="tabs" class="tabs"></div>
  </div>
  <div id="grid" class="grid"></div>
</main>
<footer id="bar" class="bar"></footer>
<script id="snapshot-data" type="application/json">${safeJson}</script>
<script>
(function(){
  var raw = document.getElementById('snapshot-data').textContent || '{}';
  var parsed = JSON.parse(raw);
  var snap = parsed.snapshot;
  var thumbs = parsed.thumbs || {};
  var isEn = snap.lang === 'en';
  var hdr = document.getElementById('hdr');
  var h1 = document.createElement('h1');
  h1.textContent = isEn ? snap.businessEn : snap.businessMl;
  var p = document.createElement('p');
  p.textContent = (isEn ? snap.locEn : snap.locMl) + ' · ' + snap.dateKey + (snap.phone ? ' · ' + snap.owner + ' (' + snap.phone + ')' : '');
  hdr.appendChild(h1);
  hdr.appendChild(p);

  document.getElementById('notice').textContent = isEn
    ? 'Offline saved snapshot created at ' + new Date(snap.createdAt).toLocaleString() + '. Please call or WhatsApp before visiting as stock changes.'
    : 'ഇതൊരു ഓഫ്‌ലൈൻ സ്നാപ്പ്ഷോട്ട് ഫയലാണ് (' + new Date(snap.createdAt).toLocaleString() + '). ഇപ്പോഴത്തെ ലഭ്യതയും വിലയും ഉറപ്പിക്കാൻ വിളിക്കുകയോ WhatsApp അയക്കുകയോ ചെയ്യുക.';

  var searchEl = document.getElementById('search');
  searchEl.placeholder = isEn ? 'Search fish...' : 'മീൻ തിരയുക...';

  var currentFilter = 'all';
  var filters = [
    {id:'all', label: isEn ? 'All' : 'എല്ലാം'},
    {id:'available', label: isEn ? 'Available' : 'ലഭ്യമാണ്'},
    {id:'limited', label: isEn ? 'Limited' : 'കുറച്ചു മാത്രം'},
    {id:'sold_out', label: isEn ? 'Sold Out' : 'തീർന്നു'}
  ];

  function unitText(u){
    if(isEn){return u==='per_piece'?'/piece':u==='per_packet'?'/packet':'/kg';}
    return u==='per_piece'?'/എണ്ണം':u==='per_packet'?'/പാക്കറ്റ്':'/കിലോ';
  }
  function statusLabel(s){
    if(s==='limited') return isEn ? 'Limited Stock' : 'കുറച്ചു മാത്രം';
    if(s==='sold_out') return isEn ? 'Sold Out' : 'തീർന്നു';
    return isEn ? 'Available' : 'ലഭ്യമാണ്';
  }
  function makeWaUrl(msg){
    if(!snap.phoneDigits) return '';
    return 'https://wa.me/' + encodeURIComponent(snap.phoneDigits) + '?text=' + encodeURIComponent(msg);
  }

  function renderTabs(){
    var tabsEl = document.getElementById('tabs');
    tabsEl.textContent = '';
    filters.forEach(function(f){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (currentFilter===f.id ? ' active' : '');
      b.textContent = f.label;
      b.onclick = function(){ currentFilter = f.id; renderTabs(); renderGrid(); };
      tabsEl.appendChild(b);
    });
  }

  function renderGrid(){
    var q = (searchEl.value || '').trim().toLowerCase();
    var grid = document.getElementById('grid');
    grid.textContent = '';
    var list = (snap.items || []).filter(function(it){
      if(currentFilter !== 'all' && it.status !== currentFilter) return false;
      if(!q) return true;
      return (it.nameMl||'').toLowerCase().includes(q) || (it.pron||'').toLowerCase().includes(q) || (it.nameEn||'').toLowerCase().includes(q);
    });
    if(list.length === 0){
      var empty = document.createElement('p');
      empty.textContent = isEn ? 'No matching fish in this snapshot.' : 'ഈ വിഭാഗത്തിൽ മീനുകൾ ഒന്നും ഇല്ല.';
      grid.appendChild(empty);
      return;
    }
    list.forEach(function(it){
      var card = document.createElement('article');
      card.className = 'card ' + it.status;
      var top = document.createElement('div');
      if(thumbs[it.id]){
        var img = document.createElement('img');
        img.className = 'thumb';
        img.src = thumbs[it.id];
        img.alt = it.nameMl;
        top.appendChild(img);
      }
      var st = document.createElement('div');
      st.className = 'status ' + it.status;
      st.textContent = (it.refNum !== null ? '#' + String(it.refNum).padStart(2,'0') + ' · ' : '') + statusLabel(it.status);
      top.appendChild(st);

      var title = document.createElement('h2');
      title.className = 'title';
      title.textContent = it.nameMl;
      top.appendChild(title);

      var sub = document.createElement('p');
      sub.className = 'sub';
      sub.textContent = it.pron + (it.nameEn ? ' · ' + it.nameEn : '');
      top.appendChild(sub);

      if(it.priceOnCall){
        var pr0 = document.createElement('p');
        pr0.className = 'price';
        pr0.textContent = isEn ? 'Call to confirm price' : 'വില അറിയാൻ വിളിക്കുക';
        top.appendChild(pr0);
      } else if(it.price){
        var pr = document.createElement('p');
        pr.className = 'price';
        pr.textContent = '₹' + it.price + unitText(it.unit);
        top.appendChild(pr);
      }

      var details = [it.size, it.qty, it.source, it.note].filter(Boolean).join(' · ');
      if(details){
        var md = document.createElement('p');
        md.className = 'meta';
        md.textContent = details;
        top.appendChild(md);
      }
      card.appendChild(top);

      if(snap.phoneDigits){
        var row = document.createElement('div');
        row.className = 'btn-row';
        var ask = document.createElement('a');
        ask.className = 'btn';
        ask.target = '_blank';
        ask.rel = 'noopener noreferrer';
        ask.textContent = it.status === 'sold_out'
          ? (isEn ? 'Next catch?' : 'അടുത്ത വരവ്?')
          : (isEn ? 'Enquire on WhatsApp' : 'WhatsApp-ൽ ചോദിക്കുക');
        ask.href = makeWaUrl((isEn ? 'Hi ' + snap.owner + ', is ' + it.nameMl + ' (' + it.pron + ') available today?' : 'നമസ്കാരം ' + snap.owner + ', ഇന്ന് ' + it.nameMl + ' ലഭ്യമാണോ?'));
        row.appendChild(ask);
        card.appendChild(row);
      }
      grid.appendChild(card);
    });
  }

  var bar = document.getElementById('bar');
  if(snap.phoneDigits){
    var callA = document.createElement('a');
    callA.className = 'cta call';
    callA.href = 'tel:+' + snap.phoneDigits;
    callA.textContent = (isEn ? 'Call ' : 'വിളിക്കുക: ') + snap.phone;
    bar.appendChild(callA);

    var waA = document.createElement('a');
    waA.className = 'cta wa';
    waA.target = '_blank';
    waA.rel = 'noopener noreferrer';
    waA.href = makeWaUrl(isEn ? 'Hi ' + snap.owner + ', checking today fish availability.' : 'നമസ്കാരം ' + snap.owner + ', ഇന്നത്തെ മീൻ വിവരങ്ങൾ അറിയാനാണ്.');
    waA.textContent = 'WhatsApp';
    bar.appendChild(waA);
  } else {
    bar.style.display = 'none';
  }

  searchEl.oninput = renderGrid;
  renderTabs();
  renderGrid();
})();
</script>
</body>
</html>`;

  const sizeBytes = new Blob([html]).size;
  return {
    html,
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    exceedsSoftWarn: sizeBytes > 3 * 1024 * 1024,
    exceedsHardWarn: sizeBytes > 5 * 1024 * 1024,
  };
}
