/**
 * Skapar en fristående mobilsida (en enda HTML-fil) med "Läget idag",
 * alla poäng och prognoser. Används för att kunna öppna Terminalen på
 * telefonen via en enda länk.  Kör: npm run export:mobil
 */
import fs from "node:fs";
import path from "node:path";
import { analyzeAll, type StockAnalysis } from "../lib/engine";
import { buildBriefing } from "../lib/briefing";
import { MARKETS } from "../lib/markets";
import { SUB_ORDER } from "../lib/analysis/types";
import { getLiveQuotes } from "../lib/data/live";

const OUT = process.argv[2] ?? path.join(process.cwd(), "data", "mobil.html");

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const nf = (v: number | null | undefined, d = 2) => (v == null || !Number.isFinite(v) ? "–" : v.toLocaleString("sv-SE", { minimumFractionDigits: d, maximumFractionDigits: d }));
const price = (v: number | null | undefined) => nf(v, v != null && Math.abs(v) >= 1000 ? 0 : 2);
const bold = (t: string) => esc(t).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const ago = (ms: number) => { const h = (Date.now() - ms) / 36e5; return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 24 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`; };

function scoreClass(s: number) { return s >= 6.5 ? "s-hi" : s >= 5.5 ? "s-up" : s > 4.5 ? "s-mid" : s > 3.5 ? "s-dn" : "s-lo"; }
function chg(v: number | null | undefined, rate = false) {
  if (v == null || !Number.isFinite(v)) return `<span class="flat">–</span>`;
  const c = v > 0.005 ? "up" : v < -0.005 ? "dn" : "flat";
  return `<span class="num ${c}">${v > 0 ? "+" : ""}${nf(v)}${rate ? "" : " %"}</span>`;
}
function pill(dir: number, label: string) {
  const c = dir > 0 ? "p-up" : dir < 0 ? "p-dn" : "p-flat";
  const a = dir > 0 ? "↗" : dir < 0 ? "↘" : "→";
  return `<span class="pill ${c}">${a} ${esc(label)}</span>`;
}
function dot(s: number) { return `<i class="dot ${s > 0.15 ? "up" : s < -0.15 ? "dn" : "flat"}"></i>`; }

function stockRow(s: StockAnalysis, why: string, live: Record<string, { price: number; changePct: number | null }>) {
  const q = live[s.item.ticker];
  return `<li class="row">
    <span class="score ${scoreClass(s.comp.total)}">${nf(s.comp.total, 1)}</span>
    <div class="grow"><div class="name">${esc(s.item.name)} ${pill(s.outlook.dir, s.outlook.label)}</div><p class="why">${esc(why)}</p></div>
    <div class="px"><div class="num">${price(q?.price ?? s.snap?.price)}</div>${chg(q?.changePct ?? s.snap?.changePct)}</div>
  </li>`;
}

async function main() {
  const a = await analyzeAll();
  const b = buildBriefing(a);
  const syms = [...MARKETS.map((m) => m.symbol), ...a.stocks.map((s) => s.item.ticker)];
  const live = (await getLiveQuotes(syms).catch(() => ({ quotes: {} }))).quotes as Record<string, { price: number; changePct: number | null; change: number | null }>;
  const now = new Date();
  const stamp = now.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const m = a.market;
  const regimeCls = m.regime === "Risk-on" ? "up" : m.regime === "Risk-off" ? "dn" : "flat";
  const toneCls = b.tone === "good" ? "t-good" : b.tone === "bad" ? "t-bad" : "t-mixed";

  const markets = MARKETS.map((mk) => {
    const q = live[mk.symbol];
    const sn = a.marketSnaps[mk.symbol];
    const p = q?.price ?? sn?.price;
    if (p == null) return "";
    const d = mk.isRate ? (q?.change ?? sn?.change) : (q?.changePct ?? sn?.changePct);
    return `<div class="mk"><span class="mk-l">${esc(mk.label)}</span><span class="num mk-p">${mk.isRate ? `${nf(p)} %` : price(p)}</span>${chg(d, mk.isRate)}</div>`;
  }).join("");

  const ranked = [...a.stocks].filter((s) => s.snap).sort((x, y) => y.comp.total - x.comp.total);
  const all = ranked.map((s) => {
    const q = live[s.item.ticker];
    const subs = SUB_ORDER.map((k) => {
      const sub = s.comp.subs[k];
      return `<li><div class="sub-h"><span>${esc(sub.label)}</span><span class="bar"><i class="${scoreClass(sub.score)}" style="width:${sub.score * 10}%"></i></span><b class="num">${nf(sub.score, 1)}</b></div><p class="${sub.insufficient ? "warn" : ""}">${esc(sub.reason)}</p></li>`;
    }).join("");
    const news = s.news.slice(0, 4).map((n) => `<li>${dot(n.sentiment)}<a href="${esc(n.link)}" target="_blank" rel="noreferrer">${esc(n.title)}</a> <span class="muted">· ${esc(n.source)}, ${ago(n.published)}</span></li>`).join("");
    return `<details class="stock">
      <summary><span class="score ${scoreClass(s.comp.total)}">${nf(s.comp.total, 1)}</span>
        <div class="grow"><div class="name">${esc(s.item.name)}</div><div class="muted small"><span class="num">${esc(s.item.ticker)}</span> · ${esc(s.comp.direction)} · Risk ${esc(s.comp.risk.toLowerCase())}</div></div>
        <div class="px"><div class="num">${price(q?.price ?? s.snap?.price)}</div>${chg(q?.changePct ?? s.snap?.changePct)}</div></summary>
      <div class="detail">
        <p class="ol">${pill(s.outlook.dir, `Prognos: ${s.outlook.label}`)} <span class="muted small">säkerhet ${esc(s.outlook.confidence.toLowerCase())}</span></p>
        <p class="small">${esc(s.outlook.summary)}</p>
        <ul class="subs">${subs}</ul>
        ${s.comp.pros.length ? `<p class="lbl up">Talar för</p><ul class="pc">${s.comp.pros.slice(0, 3).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        ${s.comp.cons.length ? `<p class="lbl dn">Talar emot</p><ul class="pc">${s.comp.cons.slice(0, 3).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        ${news ? `<p class="lbl">Senaste nyheter</p><ul class="news">${news}</ul>` : ""}
        <p class="links"><a href="https://www.avanza.se/sok.html?query=${encodeURIComponent(s.item.name)}" target="_blank" rel="noreferrer">Öppna på Avanza ↗</a></p>
      </div>
    </details>`;
  }).join("");

  const outlooks = b.outlooks.map((s) => `<li class="ocard">
      <div class="ohead"><span class="name">${esc(s.item.name)}</span>${pill(s.outlook.dir, s.outlook.label)}</div>
      <p class="small">${esc(s.outlook.summary)} <span class="muted">(säkerhet: ${esc(s.outlook.confidence.toLowerCase())})</span></p>
      ${s.outlook.keyHeadline ? `<p class="small head">${dot(s.outlook.keyHeadline.sentiment)}<a href="${esc(s.outlook.keyHeadline.link)}" target="_blank" rel="noreferrer">${esc(s.outlook.keyHeadline.title)}</a> <span class="muted">· ${esc(s.outlook.keyHeadline.source)}</span></p>` : ""}
    </li>`).join("");

  const sectors = new Set(a.stocks.map((s) => s.item.sector));
  const themes = b.themes.slice(0, 6).map((t) => {
    const tone = t.tone > 0.08 ? 1 : t.tone < -0.08 ? -1 : 0;
    const aff = t.sectors.filter((x) => sectors.has(x));
    return `<li class="ocard"><div class="ohead"><span class="name">${esc(t.label)}</span>${pill(tone, tone > 0 ? "Positiv ton" : tone < 0 ? "Negativ ton" : "Neutral")}</div>
      <p class="small muted">${t.count} rubriker senaste veckan${aff.length ? ` · kan påverka ${esc(aff.join(", ").toLowerCase())}` : ""}</p>
      <ul class="news">${t.top.slice(0, 2).map((n) => `<li>${dot(n.sentiment)}<a href="${esc(n.link)}" target="_blank" rel="noreferrer">${esc(n.title)}</a> <span class="muted">· ${esc(n.source)}</span></li>`).join("")}</ul></li>`;
  }).join("");

  const rules = m.rules.map((r) => `<li><span class="${r.effect > 0 ? "up" : r.effect < 0 ? "dn" : "flat"}">${r.effect > 0 ? "✓" : r.effect < 0 ? "✕" : "–"}</span> ${esc(r.detail)}</li>`).join("");

  const html = `<title>Terminalen Mobil</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Layout: en kolumn för telefon, sektioner med ankarflikar överst. Mörkt först, som appen. */
:root{--bg:#0b0e14;--panel:#121722;--panel2:#171d2a;--border:#212938;--text:#e6e9ef;--text2:#b4bccb;--muted:#8790a3;--accent:#f0a63a;--up:#3fb68b;--dn:#f2635f;--upbg:rgba(63,182,139,.14);--dnbg:rgba(242,99,95,.14);--sans:"Inter",system-ui,-apple-system,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace;color-scheme:dark}
@media (prefers-color-scheme: light){:root:not([data-theme="dark"]){--bg:#f6f7f9;--panel:#fff;--panel2:#f1f3f6;--border:#e2e6ec;--text:#121620;--text2:#374151;--muted:#5d6676;--accent:#b86e00;--up:#0d8a5c;--dn:#cc2f2b;--upbg:rgba(13,138,92,.1);--dnbg:rgba(204,47,43,.09);color-scheme:light}}
:root[data-theme="light"]{--bg:#f6f7f9;--panel:#fff;--panel2:#f1f3f6;--border:#e2e6ec;--text:#121620;--text2:#374151;--muted:#5d6676;--accent:#b86e00;--up:#0d8a5c;--dn:#cc2f2b;--upbg:rgba(13,138,92,.1);--dnbg:rgba(204,47,43,.09);color-scheme:light}
body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}
.wrap{max-width:640px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:8px 40px;display:flex;flex-direction:column;gap:22px}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.up{color:var(--up)}.dn{color:var(--dn)}.flat{color:var(--muted)}.muted{color:var(--muted)}.small{font-size:13px}.warn{color:var(--accent)!important}
a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}
header.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:9;background:var(--bg);margin-inline:calc(-1*max(16px,env(safe-area-inset-left,0px)));padding:10px max(16px,env(safe-area-inset-left,0px)) 8px;border-bottom:1px solid var(--border)}
.brand{display:flex;align-items:center;justify-content:space-between;gap:8px}
.logo{display:flex;align-items:center;gap:8px;font-weight:600}.logo i{display:grid;place-items:center;width:24px;height:24px;border-radius:6px;background:var(--accent);color:#14100a;font-style:normal;font-size:12px;font-weight:700}
.stamp{font-size:11px;color:var(--muted);text-align:right}
nav.tabs{display:flex;gap:6px;overflow-x:auto;margin-top:8px;scrollbar-width:none}nav.tabs a{flex:none;font-size:13px;padding:5px 11px;border-radius:999px;background:var(--panel2);color:var(--text2)}
.markets{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.mk{flex:none;display:flex;flex-direction:column;gap:1px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--panel);font-size:12px;min-width:96px}.mk-l{color:var(--muted)}.mk-p{font-size:14px}
h2{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;font-weight:600}
.hero{border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:14px;background:var(--panel);padding:16px}
.hero.t-good{border-left-color:var(--up)}.hero.t-bad{border-left-color:var(--dn)}
.hero h1{font-size:21px;line-height:1.25;margin:2px 0 10px;text-wrap:balance}
.hero ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px}.hero li{color:var(--text2);font-size:14px}.hero b{color:var(--text);font-weight:600}
.regime{margin-top:14px;padding-top:12px;border-top:1px solid var(--border)}.regime .r{font-size:17px;font-weight:600}
.regime ul{gap:5px}.regime li{font-size:12.5px}
.list{list-style:none;margin:0;padding:0;border:1px solid var(--border);border-radius:14px;background:var(--panel);overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:11px 12px;border-top:1px solid var(--border)}.row:first-child{border-top:0}
.grow{flex:1;min-width:0}.name{font-weight:600;font-size:14.5px;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.why{margin:2px 0 0;font-size:12.5px;color:var(--text2)}
.px{text-align:right;font-size:13px;flex:none}
.score{flex:none;display:grid;place-items:center;width:40px;height:34px;border-radius:9px;font-family:var(--mono);font-weight:600;font-size:14px}
.s-hi{color:var(--up);background:var(--upbg)}.s-up{color:var(--up);background:color-mix(in oklab,var(--upbg) 55%,transparent)}.s-mid{color:var(--text2);background:var(--panel2)}.s-dn{color:var(--dn);background:color-mix(in oklab,var(--dnbg) 55%,transparent)}.s-lo{color:var(--dn);background:var(--dnbg)}
.pill{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:600;padding:2px 7px;border-radius:6px;white-space:nowrap}
.p-up{color:var(--up);background:var(--upbg)}.p-dn{color:var(--dn);background:var(--dnbg)}.p-flat{color:var(--text2);background:var(--panel2)}
.cards{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.ocard{border:1px solid var(--border);border-radius:12px;background:var(--panel);padding:12px}
.ohead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}
.ocard p{margin:4px 0 0;color:var(--text2)}.head{display:flex;gap:7px}
.dot{flex:none;display:inline-block;width:8px;height:8px;border-radius:50%;margin:6px 7px 0 0;background:var(--border)}.dot.up{background:var(--up)}.dot.dn{background:var(--dn)}
.news{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px}.news li{display:flex;align-items:flex-start;color:var(--text2)}
.stock{border-top:1px solid var(--border)}.stock:first-child{border-top:0}
.stock summary{display:flex;align-items:center;gap:12px;padding:11px 12px;cursor:pointer;list-style:none}.stock summary::-webkit-details-marker{display:none}
.stock[open] summary{background:var(--panel2)}
.detail{padding:4px 12px 14px;background:var(--panel2)}.detail p{margin:6px 0}
.subs{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}.subs p{margin:2px 0 0;font-size:12px;color:var(--muted)}
.sub-h{display:flex;align-items:center;gap:8px;font-size:13px}.sub-h span:first-child{width:120px;flex:none;color:var(--text2)}
.bar{flex:1;height:6px;border-radius:3px;background:var(--border);overflow:hidden}.bar i{display:block;height:100%;border-radius:3px;background:currentColor}
.lbl{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:12px!important;font-weight:600}
.pc{margin:0;padding-left:18px;font-size:13px;color:var(--text2)}
.links a{color:var(--accent);font-size:13px;font-weight:500}
.foot{font-size:12px;color:var(--muted);border-top:1px solid var(--border);padding-top:14px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
@media (prefers-reduced-motion: reduce){*{scroll-behavior:auto!important}}
html{scroll-behavior:smooth;scroll-padding-top:110px}
</style>
<div class="wrap">
  <header class="top">
    <div class="brand"><span class="logo"><i>T</i>Terminalen</span><span class="stamp">Uppdaterad<br><span class="num">${esc(stamp)}</span></span></div>
    <nav class="tabs" aria-label="Avsnitt"><a href="#lage">Läget</a><a href="#bra">Bra / svagt</a><a href="#prognos">Prognoser</a><a href="#teman">Världen</a><a href="#alla">Alla bolag</a></nav>
  </header>

  <div class="markets" aria-label="Marknader">${markets}</div>

  <section id="lage" class="hero ${toneCls}">
    <h2>Läget idag</h2>
    <h1>${esc(b.headline)}</h1>
    <ul>${b.bullets.map((x) => `<li>${bold(x.text)}</li>`).join("")}</ul>
    <div class="regime"><div class="muted small">Marknadsläge</div><div class="r ${regimeCls}">${esc(m.regime)}</div><ul>${rules}</ul></div>
  </section>

  <section id="bra">
    <h2 class="up">Ser bra ut</h2>
    <ul class="list">${b.strong.length ? b.strong.map((s) => stockRow(s, s.comp.pros[0] ?? s.comp.subs.technical.reason, live)).join("") : `<li class="row muted small">Inget bolag når 5,5 just nu – signalerna är blandade.</li>`}</ul>
  </section>
  <section>
    <h2 class="dn">Ser svagt ut</h2>
    <ul class="list">${b.weak.length ? b.weak.map((s) => stockRow(s, s.comp.cons[0] ?? s.comp.subs.technical.reason, live)).join("") : `<li class="row muted small">Inga bolag under 5 just nu.</li>`}</ul>
  </section>

  <section id="prognos">
    <h2>Prognos 1–4 veckor</h2>
    <p class="small muted" style="margin:-2px 0 10px">Regelbaserad gissning från nyheter och kursrörelser. Kan ofta vara fel.</p>
    <ul class="cards">${outlooks}</ul>
  </section>

  <section id="teman">
    <h2>Världsnyheterna – vad kan de betyda?</h2>
    <ul class="cards">${themes || `<li class="ocard small muted">Inga världsnyheter kunde hämtas.</li>`}</ul>
  </section>

  <section id="alla">
    <h2>Alla bolag – tryck för detaljer</h2>
    <div class="list">${all}</div>
  </section>

  <p class="foot">Poäng 1–10: 7+ = köpintresse, 4 eller lägre = undvik. Allt räknas fram med fasta regler (ingen AI). Kurser från Yahoo Finance kan vara fördröjda. Nyheter: Google News, SVT, BBC, NYT. Ej finansiell rådgivning.</p>
</div>
`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log(`✔ Mobilsidan sparad: ${OUT} (${Math.round(html.length / 1024)} kB)`);
}

main().catch((e) => { console.error("✖ Kunde inte skapa mobilsidan:", e); process.exit(1); });
