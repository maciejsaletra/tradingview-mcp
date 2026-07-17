const fs = require('fs');

const template = fs.readFileSync('context/session_analysis_template.html', 'utf8');
const logoB64 = fs.readFileSync('scratchpad_logo_b64.txt', 'utf8').trim();

const sess1Bullets = [
  'Zakres dotychczasowy: 3969.3–3997.0, niska płynność (M15 wolumen ~2–4k)',
  'Obserwuj reakcję od OB 3974.5–3969.3 (bullish OB na dzisiejszy sweep low)',
  'Brak nowych wejść bez potwierdzonego CHoCH H1'
].map(t => `<li>${t}</li>`).join('');

const sess2Bullets = [
  'Kluczowy poziom: strefa entry sig-088 4042.41–4050.74',
  'Obserwuj wolumen na otwarciu — potencjalny impuls kontynuacji spadkowej lub retest strefy',
  'SL 4074 pozostaje kluczowym punktem inwalidacji tezy spadkowej'
].map(t => `<li>${t}</li>`).join('');

const bslRows = [
  { tf: 'H1', lbl: 'OB niezrealizowany (strefa entry sig-088)', price: '4 050.74' },
  { tf: 'H4', lbl: 'OB / rollover high sesji', price: '4 104.05' },
  { tf: 'D1', lbl: 'Order Block Detector — strefa powyżej', price: '4 163.95' },
].map(r => `<div class="liq-row"><span class="tf-tag">${r.tf}</span><span class="liq-lbl">${r.lbl}</span><span class="liq-price red">${r.price}</span></div>`).join('\n');

const sslRows = [
  { tf: 'M15', lbl: 'Dzisiejszy sweep low (bullish OB)', price: '3 969.35', cls: 'white' },
  { tf: 'H1', lbl: 'OB — zbieżny z TP2 sig-088', price: '3 928.69', cls: 'green' },
  { tf: 'H4', lbl: 'OB — zbieżny z TP3 sig-088', price: '3 876.36', cls: 'green' },
].map(r => `<div class="liq-row"><span class="tf-tag">${r.tf}</span><span class="liq-lbl">${r.lbl}</span><span class="liq-price ${r.cls}">${r.price}</span></div>`).join('\n');

const fvgRows = [
  { tf: 'H1', sq: 'pink', lbl: 'Brak świeżego FVG H1 — bazowo: OB 4045.92–4050.74 (entry sig-088)', price: '4 045.92–4 050.74' },
  { tf: 'M15', sq: 'green', lbl: 'Brak świeżego FVG M15 — bazowo: OB dzisiejszego sweep low', price: '3 969.35–3 974.54' },
].map(r => `<div class="liq-row"><span class="tf-tag">${r.tf}</span><span class="fvg-sq ${r.sq}"></span><span class="liq-lbl">${r.lbl}</span><span class="liq-price white">${r.price}</span></div>`).join('\n');

const levelRows = [
  { dot: 'dot-entry', name: 'Entry', note: 'OB H1 (LuxAlgo) — strefa jeszcze niewystawiona', price: '4 042.41–4 050.74' },
  { dot: 'dot-sl', name: 'SL', note: 'powyżej OB / rollover high sesji', price: '4 074.00' },
  { dot: 'dot-tp', name: 'TP1', note: 'płynność / cel sesyjny', price: '3 960.00' },
  { dot: 'dot-tp', name: 'TP2', note: 'OB confluence 3 942.7–3 928.7', price: '3 928.00' },
  { dot: 'dot-tp', name: 'TP3', note: 'OB confluence 3 876.4–3 866.4', price: '3 876.00' },
].map(r => `<div class="lvl-row"><span class="lvl-dot ${r.dot}"></span><div class="lvl-main"><div class="lvl-name">${r.name}</div><div class="lvl-note">${r.note}</div></div><span class="lvl-price">${r.price}</span></div>`).join('\n');

const replacements = {
  '<LOGO_BASE64>': logoB64,
  '<DATE_TIME_UTC>': '17.07.2026 00:50 UTC · 01:50 BST',
  '<TICKER>': 'XAUUSD',
  '<PRICE>': '3 984.16',
  '<BIAS_BADGE>': 'SHORT BIAS',
  '<BIAS_BG>': '#3a1212',
  '<BIAS_TEXT>': '#f87171',
  '<PREV_SETUP_HTML>': '<b>sig-088</b> SHORT — status: entry 4042.41–4050.74 wciąż niewystawiony (bar-walk M15 21:15–00:50 UTC: max high 3997.04, ~45 pkt poniżej strefy). SL 4074, TP1 3960 / TP2 3928 / TP3 3876. RR planned 3.16, confidence 83%, setup type B (kontynuacja).',
  '<CONTEXT_HTML>': 'Sesja azjatycka, płynność niska (wolumen M15 ~2–4k vs ~10k+ w Londynie/NY). <b>D1:</b> silny trend spadkowy w tygodniu (4180 → 3975, ok. -4.9%), piątkowa świeca konsoliduje blisko dołków tygodnia. DXY 100.73 stabilny, VIX 16.72 spokojny — brak macro conflict. Kontekst geopolityczny: eskalacja na Bliskim Wschodzie podbija ropę (UKOIL +2.8% w 80h), co wspiera presję inflacyjną i twardszą retorykę Fed — krótkoterminowo negatywne dla złota. Brak eventów high-impact w kalendarzu ForexFactory na dziś.',
  '<TILE_BIAS_D1>': 'Bearish -4.9%',
  '<TILE_H4>': 'Downtrend, odbicie',
  '<TILE_FAZA>': 'Konsolid. po sweep 3969',
  '<TILE_PROB>': '62%',
  '<SESS1_TITLE>': '🌏 Azja 00:00–08:00 UK',
  '<SESS1_BULLETS_LI>': sess1Bullets,
  '<SESS2_TITLE>': '🇬🇧 Londyn 08:00–12:00 UK',
  '<SESS2_BULLETS_LI>': sess2Bullets,
  '<SCEN_A_TEXT>': 'Cena wraca do strefy 4042–4050 (retest OB) → sig-088 SHORT aktywuje się, kontynuacja do TP1 3960 / TP2 3928',
  '<SCEN_A_PROB>': '45%',
  '<SCEN_B_TEXT>': 'Konsolidacja w rejonie 3970–4000 utrzymuje się przez całą sesję azjatycką, entry nie zostaje wystawiony aż do Londynu',
  '<SCEN_B_PROB>': '35%',
  '<SCEN_C_TEXT>': 'H1 close powyżej 4074 (SL) — struktura spadkowa unieważniona, wymagana ręczna rewizja tezy',
  '<SCEN_C_PROB>': '20%',
  '<BSL_ROWS>': bslRows,
  '<SSL_ROWS>': sslRows,
  '<FVG_ROWS>': fvgRows,
  '<FIB_ENTRY>': 'n/d — brak świeżego impulsu H1',
  '<FIB_TARGET>': 'n/d — entry oparty o OB, nie fib',
  '<LEVEL_ROWS>': levelRows,
  '<RR_TP1>': '1:3.16',
  '<RR_TP2>': '1:4.32',
  '<RR_TP3>': '1:6.22',
};

let out = template;
for (const [key, val] of Object.entries(replacements)) {
  out = out.split(key).join(val);
}

fs.mkdirSync('screenshots/xau', { recursive: true });
fs.writeFileSync('screenshots/xau/session_asia_2026-07-17_filled.html', out, 'utf8');
console.log('written');
