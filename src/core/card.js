/**
 * Composes a branded signal card by stamping the TRW logo onto a raw chart
 * screenshot, or renders a full HTML card to PNG via Puppeteer.
 */
import { Jimp, JimpMime } from 'jimp';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { dirname, join, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(dirname(__dirname));
const LOGO_PATH = join(REPO_ROOT, 'assets', 'trw_logo.jpg');

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Returns session tag + display labels for a given UTC timestamp.
 * Ranges (UTC): ASIA 00–07 · LONDYN 08–12 · NEW YORK 13–21 · OFF-SESSION 22–23
 *
 * @param {Date|string|number|null} dateInput — UTC Date, ISO string, epoch ms, or null (= now)
 * @returns {{ tag: string, label: string, display: string }}
 *   tag:     code-friendly key  → "asia" | "london" | "ny" | "off_session"
 *   label:   PLAN title suffix  → "ASIA" | "LONDYN" | "NEW YORK" | "OFF-SESSION"
 *   display: sys-chip text      → "asia" | "londyn"  | "new york" | "off-session"
 */
export function getSessionTag(dateInput = null) {
  const d = dateInput instanceof Date  ? dateInput
          : typeof dateInput === 'string' && dateInput ? new Date(dateInput)
          : typeof dateInput === 'number' ? new Date(dateInput)
          : new Date();
  // Session boundaries are defined in London local time (schedule and scalp
  // windows run in UK time) — during BST, pure UTC hours would mislabel the
  // 08:30 UK London routine as ASIA.
  const h = parseInt(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', hour12: false,
  }).format(d), 10);
  if (h <= 7)  return { tag: 'asia',        label: 'ASIA',        display: 'asia' };
  if (h <= 12) return { tag: 'london',      label: 'LONDYN',      display: 'londyn' };
  if (h <= 21) return { tag: 'ny',          label: 'NEW YORK',    display: 'new york' };
  return              { tag: 'off_session', label: 'OFF-SESSION', display: 'off-session' };
}

/**
 * Returns a London-time display string for a UTC Date.
 * Format: "2026-07-07 – UTC HH:MM → HH:MM BST"  (or GMT when not in summer time)
 */
function getLondonTimeDisplay(utcDate) {
  const pad = n => String(n).padStart(2, '0');
  const utcStr = `${pad(utcDate.getUTCHours())}:${pad(utcDate.getUTCMinutes())}`;
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(utcDate);
  const lHH = dateParts.find(p => p.type === 'hour').value;
  const lMM = dateParts.find(p => p.type === 'minute').value;
  const londonStr = `${lHH}:${lMM}`;
  const offset = ((parseInt(lHH) - utcDate.getUTCHours()) + 24) % 24;
  const suffix = offset === 1 ? 'BST' : 'GMT';
  const dateStr = utcDate.toISOString().slice(0, 10);
  return `${dateStr} – UTC ${utcStr} → ${londonStr} ${suffix}`;
}

/**
 * Loads TRW logo from assets/trw_logo.jpg as a base64 data URI.
 * Returns a fallback SVG data URI if the file is missing.
 */
function loadLogoBlock() {
  if (existsSync(LOGO_PATH)) {
    const ext  = LOGO_PATH.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const b64  = readFileSync(LOGO_PATH).toString('base64');
    return `<img class="logo" src="data:${ext};base64,${b64}" alt="TRW">`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="22" fill="#1e1f24" stroke="#4a4a45" stroke-width="1.5" stroke-dasharray="4,2"/><text x="23" y="17" text-anchor="middle" fill="#4a4a45" font-size="8" font-family="sans-serif" font-weight="700">TRW</text><text x="23" y="27" text-anchor="middle" fill="#4a4a45" font-size="7" font-family="sans-serif">logo</text><text x="23" y="36" text-anchor="middle" fill="#4a4a45" font-size="7" font-family="sans-serif">missing</text></svg>`;
  return `<img class="logo" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" alt="TRW logo missing">`;
}

// Finds newest <setupId>_m15_standard_*.png in screenshots/<group>/
// Refuses any file without "m15_standard" in the name — enforces §7b naming convention.
function findLatestM15Screenshot(screenshotsDir, group, setupId) {
  const groupDir = join(screenshotsDir, group);
  if (!existsSync(groupDir)) return null;
  const files = readdirSync(groupDir)
    .filter(f => f.startsWith(setupId) && f.toLowerCase().includes('m15_standard') && /\.(png|jpg)$/i.test(f))
    .map(f => ({ name: f, mtime: statSync(join(groupDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? join(groupDir, files[0].name) : null;
}

/**
 * Validates a screenshot against §7b M15 standard rules.
 * Checks: (1) filename contains "m15_standard", (2) companion _meta.json exists,
 * (3) meta fields confirm TF=15, entry_box, sl_line, tp_lines.
 * Returns { valid: boolean, issues: string[] }.
 */
export function validateM15Screenshot(screenshotAbsPath) {
  const issues = [];
  const basename = screenshotAbsPath.replace(/\\/g, '/').split('/').pop().toLowerCase();

  if (!basename.includes('m15_standard')) {
    issues.push('filename nie zawiera "m15_standard" — TF nieznany, prawdopodobnie H1 lub inny');
    return { valid: false, issues };
  }

  const metaPath = screenshotAbsPath.replace(/\.(png|jpg)$/i, '_meta.json');
  if (!existsSync(metaPath)) {
    issues.push('brak pliku _meta.json — screenshot nie przeszedł §7b checklist (bar-walk nie zapisał metadanych)');
    return { valid: false, issues };
  }

  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch {
    issues.push('_meta.json jest uszkodzony lub nie jest poprawnym JSON');
    return { valid: false, issues };
  }

  if (meta.screenshot_type !== 'm15_standard') issues.push(`screenshot_type="${meta.screenshot_type}" (wymagane: "m15_standard")`);
  if (String(meta.timeframe) !== '15')         issues.push(`TF=${meta.timeframe} (wymagane: 15)`);
  if (!meta.has_entry_box)                     issues.push('has_entry_box=false — brak żółtego ENTRY boxa na wykresie');
  if (!meta.has_sl_line)                       issues.push('has_sl_line=false — brak poziomej linii SL');
  if (!meta.has_tp_lines)                      issues.push('has_tp_lines=false — brak poziomych linii TP1/TP2');

  return { valid: issues.length === 0, issues };
}

function computeRR(setup) {
  const mid = (parseFloat(setup.entry_lower) + parseFloat(setup.entry_upper)) / 2;
  const sl  = parseFloat(setup.sl);
  const tp1 = parseFloat(setup.tp1);
  if (!mid || !sl || !tp1 || isNaN(mid) || isNaN(sl) || isNaN(tp1)) return '—';
  const risk   = Math.abs(mid - sl);
  const reward = Math.abs(tp1 - mid);
  return risk > 0 ? `1:${(reward / risk).toFixed(1)}` : '—';
}

// ─── fillCarryoverTemplate ────────────────────────────────────────────────────
/**
 * Fills carryover_card_template.html with live data from active_setups.json
 * and the validated M15 standard screenshot, then optionally renders to PNG.
 *
 * Screenshot resolution priority (M15 standard ONLY — H1 refused):
 *   1. setup.screenshot_m15_path (explicit field, written by bar-walk after §7b capture)
 *   2. Auto-discover: screenshots/<group>/<setupId>_m15_standard_*.png (newest by mtime)
 *   3. Validation via companion _meta.json (TF=15, entry_box, sl_line, tp_lines)
 *   4. Fallback placeholder div + INCOMPLETE banner if missing or invalid
 *
 * §7b screenshot naming convention (bar-walk must follow):
 *   screenshots/<group>/<id>_m15_standard_<YYYY-MM-DD>_<HHMM>.png
 *   screenshots/<group>/<id>_m15_standard_<YYYY-MM-DD>_<HHMM>_meta.json
 *
 * Usage (CLI): tv card fill-carryover --id legacy-071 --out screenshots/xau/legacy-071_card.png
 *              --headline "LONG aktywny" --tf-d1 "..." --tf-h4 "..." ...
 */
export async function fillCarryoverTemplate(setupId, opts = {}) {
  const {
    setupsPath    = join(REPO_ROOT, 'memory', 'active_setups.json'),
    templatePath  = join(REPO_ROOT, 'context', 'carryover_card_template.html'),
    screenshotsDir = join(REPO_ROOT, 'screenshots'),
    outHtmlPath   = null,
    outPngPath    = null,
    width         = 800,
    tfD1          = null,
    tfH4          = null,
    tfH1          = null,
    tfM15         = null,
    statusHeadline = null,
    barwalkText   = null,
    newsRisk      = null,
    newsContext   = null,
    dateTime      = null,
    setupLabel    = null,
    sessionOverride = null,   // { tag, label, display } — skip auto-detection
    m5Show        = true,     // show M5 scalp section (auto-generated from setup)
    m5Entry       = null,     // override: e.g. "4146–4163 od góry"
    m5Sl          = null,     // override: e.g. "4112"
    m5Tp          = null,     // override: e.g. "4221"
    m5Status      = 'waiting',// "waiting" | "taken" | "invalidated"
    m5Note        = null,     // override: 1-2 zdania
  } = opts;

  // 1. Load setup record
  const setups = JSON.parse(readFileSync(setupsPath, 'utf8'));
  const setup  = setups.active_setups.find(s => s.id === setupId);
  if (!setup) throw new Error(`Setup '${setupId}' not found in active_setups.json`);

  // 2. Resolve M15 standard screenshot (refuses H1 / non-standard files)
  // Field: setup.screenshot_m15_path — written by bar-walk after §7b capture
  // Fallback: auto-discover newest <id>_m15_standard_*.png in screenshots/<group>/
  let screenshotAbsPath = null;
  if (setup.screenshot_m15_path) {
    const abs = resolve(setup.screenshot_m15_path);
    if (existsSync(abs)) screenshotAbsPath = abs;
  }
  if (!screenshotAbsPath) {
    screenshotAbsPath = findLatestM15Screenshot(screenshotsDir, setup.group || 'xau', setupId);
  }

  // 3. Validate against §7b standard + build chart block
  // Valid: filename has "m15_standard", companion _meta.json confirms TF=15 + entry_box + sl + tp
  // Invalid or missing: placeholder div with specific reason — card marked INCOMPLETE
  let chartBlock;
  let screenshotMissing  = !screenshotAbsPath;
  let screenshotInvalid  = false;

  if (screenshotAbsPath) {
    const validation = validateM15Screenshot(screenshotAbsPath);
    if (validation.valid) {
      const mime = extname(screenshotAbsPath).toLowerCase() === '.jpg' ? 'image/jpeg' : 'image/png';
      const b64  = readFileSync(screenshotAbsPath).toString('base64');
      chartBlock = `<img class="chart-img" src="data:${mime};base64,${b64}" alt="chart M15 standard — ${setupId}">`;
    } else {
      screenshotInvalid = true;
      const bullets = validation.issues.map(i => `&#8226; ${i}`).join('<br>');
      chartBlock = `<div class="chart-placeholder">&#9888;&nbsp; Screenshot nie spełnia standardu §7b M15:<br><br>${bullets}<br><br>Uruchom §7b bar-walk — 6-krokowy standard (M15 + Auto fit + żółty ENTRY box + SL + TP).</div>`;
    }
  } else {
    chartBlock = `<div class="chart-placeholder">&#9888;&nbsp; Brak screena M15 standard.<br>Uruchom §7b bar-walk: M15 + Auto fit + ENTRY box (żółty) + SL + TP1/TP2 + capture_screenshot region=chart.<br>Zapisz jako &lt;id&gt;_m15_standard_&lt;ts&gt;.png + _meta.json</div>`;
  }

  // 4. Compute session tag from dateTime (or now), with optional manual override
  // Parse "YYYY-MM-DD HH:MM UTC" → Date. Fallback to current time.
  let sessionDate = new Date();
  if (dateTime) {
    // Normalise "2026-07-07 13:46 UTC" → "2026-07-07T13:46Z"
    const normalised = dateTime.replace(' UTC', 'Z').replace(' ', 'T');
    const parsed = new Date(normalised);
    if (!isNaN(parsed)) sessionDate = parsed;
  }
  const session = sessionOverride ?? getSessionTag(sessionDate);

  // 5. Compute display values
  const dir        = setup.direction || 'LONG';
  const biasBg     = dir === 'SHORT' ? '#3a1212' : '#123a12';
  const biasColor  = dir === 'SHORT' ? '#f87171' : '#4ade80';
  const statusColor = '#4ade80';
  const nr         = (newsRisk || setup.news_risk || 'none').toLowerCase();
  const nrColor    = nr === 'high' ? '#f87171' : nr === 'low' ? '#f5c842' : '#4ade80';
  const tp3        = setup.tp3;
  const levelsCols = tp3 ? '5' : '4';
  const tp3Tile    = tp3
    ? `<div class="level-tile"><div class="level-lbl">TP3</div><div class="level-val val-tp">${tp3}</div></div>`
    : '';

  // Confidence: ≥75% = high (green), 65-74% = mid (gold), <65% = low (gray)
  const conf      = typeof setup.confidence === 'number' ? setup.confidence : null;
  const confStr   = conf !== null ? String(conf) : '—';
  const confClass = conf === null ? 'conf-low'
    : conf >= 75 ? 'conf-high'
    : conf >= 65 ? 'conf-mid'
    : 'conf-low';

  // London time display: "2026-07-07 – UTC 13:46 → 14:46 BST"
  const londonDisplay = getLondonTimeDisplay(sessionDate);

  // Logo block from single source (assets/trw_logo.jpg)
  const logoBlock = loadLogoBlock();

  // M5 section — two variants (§7b E7 audit fix 2026-07-08):
  //   "Dzień dobry – M5 scalp trade" ONLY when a real lifecycle:"scalp" entry exists
  //   for this instrument (its own M5-derived levels, per §7 krok 6.5).
  //   Otherwise: "Plan retestu M5 (wejście intraday)" — same tiles, honest label,
  //   levels come from the swing setup (it IS the swing entry plan, not a scalp).
  let m5ScalpBlock = '';
  if (m5Show) {
    const scalpSetup = setups.active_setups.find(s =>
      s.id !== setupId &&
      s.lifecycle === 'scalp' &&
      (s.instrument || '').toUpperCase() === (setup.instrument || '').toUpperCase());

    const src = scalpSetup || setup;
    const m5EntryVal  = m5Entry  || (src.entry_lower && src.entry_upper
      ? `${src.entry_lower}–${src.entry_upper}`
      : '—');
    const m5SlVal     = m5Sl    || src.sl   || '—';
    const m5TpVal     = m5Tp    || src.tp1  || '—';
    const m5StatusTag = (m5Status || 'waiting').toLowerCase().replace(/[^a-z]/g, '');
    const m5Header    = scalpSetup
      ? '&#9728; Dzie&#324; dobry &ndash; M5 scalp trade'
      : '&#9728; Plan retestu M5 (wej&#347;cie intraday)';
    const m5NoteVal   = m5Note  || (scalpSetup
      ? `Scalp ${scalpSetup.id} (risk 0.25%, deadline ${scalpSetup.session_close_by || '—'}) — poziomy z analizy M5, nie ze swinga.`
      : dir === 'LONG'
        ? `Retest strefy ENTRY od góry na M5 — spójny z planem LONG M15. Wejście po bazie M5 (BOS lub bullish engulf w strefie).`
        : `Retest strefy ENTRY od dołu na M5 — spójny z planem SHORT M15. Wejście po bazie M5 (BOS lub bearish engulf w strefie).`);
    m5ScalpBlock = `<div class="m5-section">
  <div class="m5-header">${m5Header}</div>
  <div class="m5-grid">
    <div class="m5-tile"><div class="m5-lbl">Entry (retest)</div><div class="m5-val val-entry">${m5EntryVal}</div></div>
    <div class="m5-tile"><div class="m5-lbl">SL</div><div class="m5-val val-sl">${m5SlVal}</div></div>
    <div class="m5-tile"><div class="m5-lbl">TP</div><div class="m5-val val-tp">${m5TpVal}</div></div>
    <div class="m5-tile"><div class="m5-lbl">Status</div><div class="m5-val m5-status-${m5StatusTag}">${m5StatusTag}</div></div>
  </div>
  <div class="m5-note">${m5NoteVal}</div>
</div>`;
  }

  // 6. Incomplete-data detection
  const missingLevels = !setup.entry_lower || !setup.sl || !setup.tp1;
  const incomplete    = screenshotMissing || screenshotInvalid || missingLevels;
  const incompleteBanner = incomplete
    ? `<div class="card-incomplete">&#9888; KARTA NIEKOMPLETNA —${screenshotMissing ? ' brak screena §7b M15' : ''}${screenshotInvalid ? ' screenshot nie spełnia standardu §7b (TF/box/meta)' : ''}${missingLevels ? ' brak ENTRY/SL/TP' : ''} — nie publikuj</div>`
    : '';

  // 7. Replacements map — covers ALL placeholders in the template
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const dtDisplay = dateTime || now;
  const R = {
    '<LOGO_BLOCK>':        logoBlock,
    '<CHART_BLOCK>':       chartBlock,
    '<INCOMPLETE_BANNER>': incompleteBanner,
    '<M5_SCALP_BLOCK>':    m5ScalpBlock,
    '<SESSION_LABEL>':     session.label,    // "ASIA" | "LONDYN" | "NEW YORK" | "OFF-SESSION"
    '<SESSION_TAG>':       session.tag,      // "asia" | "london" | "ny" | "off_session"
    '<SESSION_DISPLAY>':   session.display,  // "asia" | "londyn" | "new york" | "off-session"
    '<TICKER>':            setup.instrument || '—',
    '<SETUP_LABEL>':       setupLabel || setup.id,
    '<DATE_TIME>':         dtDisplay,        // kept for backward compat with older templates
    '<DATE_TIME_LONDON>':  londonDisplay,    // "2026-07-07 – UTC 13:46 → 14:46 BST"
    '<BIAS_TEXT>':         dir,
    '<BIAS_BG>':           biasBg,
    '<BIAS_COLOR>':        biasColor,
    '<TF_D1>':            tfD1   || '— (podaj --tf-d1)',
    '<TF_H4>':            tfH4   || '— (podaj --tf-h4)',
    '<TF_H1>':            tfH1   || '— (podaj --tf-h1)',
    '<TF_M15>':           tfM15  || '— (podaj --tf-m15)',
    '<STATUS_COLOR>':     statusColor,
    '<STATUS_HEADLINE>':  statusHeadline || `${dir} aktywny — carry-over`,
    '<BARWALK_TEXT>':     barwalkText || '— uruchom §7b bar-walk, aby zaktualizować.',
    '<ENTRY_RANGE>':      (setup.entry_lower && setup.entry_upper)
                            ? `${setup.entry_lower}–${setup.entry_upper}` : '— — —',
    '<SL>':               setup.sl  || '— — —',
    '<TP1>':              setup.tp1 || '— — —',
    '<TP2>':              setup.tp2 || '— — —',
    '<TP3_TILE>':         tp3Tile,
    '<LEVELS_COLS>':      levelsCols,
    '<SL_UPDATE_BADGE>':  setup.sl_updated ? '↑ scen. A' : '',
    '<SETUP_TYPE>':       setup.setup_type || 'A',
    '<RR_PLANNED>':       setup.rr_planned || computeRR(setup),
    '<CONFIDENCE>':       confStr,
    '<CONF_CLASS>':       confClass,
    '<NEWS_RISK>':        nr,
    '<NEWS_RISK_COLOR>':  nrColor,
    '<NEWS_CONTEXT>':     newsContext || setup.news_context || '—',
  };

  // 8. Fill template (safe split-join on all keys)
  let html = readFileSync(templatePath, 'utf8');
  for (const [k, v] of Object.entries(R)) {
    html = html.split(k).join(String(v ?? ''));
  }

  // 9. Write filled HTML
  const htmlOut = outHtmlPath
    ?? join(screenshotsDir, setup.group || 'xau', `${setupId}_filled.html`);
  mkdirSync(dirname(htmlOut), { recursive: true });
  writeFileSync(htmlOut, html, 'utf8');

  // 10. Optionally render to PNG
  if (outPngPath) await renderHtml(htmlOut, outPngPath, width);

  return {
    success: true,
    htmlPath: htmlOut,
    pngPath: outPngPath ?? null,
    incomplete,
    screenshotStatus: screenshotMissing ? 'missing' : screenshotInvalid ? 'invalid' : 'ok',
    session: { tag: session.tag, label: session.label },
  };
}

// ─── composeCard ─────────────────────────────────────────────────────────────
export async function composeCard(screenshotPath, outPath) {
  if (!existsSync(screenshotPath)) {
    throw new Error(`Screenshot not found: ${screenshotPath}`);
  }
  if (!existsSync(LOGO_PATH)) {
    throw new Error(`Logo not found: ${LOGO_PATH}`);
  }

  const chart = await Jimp.read(screenshotPath);
  const logo = await Jimp.read(LOGO_PATH);

  const logoSize = Math.round(Math.min(chart.bitmap.width, chart.bitmap.height) * 0.12);
  logo.resize({ w: logoSize, h: logoSize });

  const margin = Math.round(logoSize * 0.25);
  chart.composite(logo, chart.bitmap.width - logoSize - margin, margin);

  await chart.write(outPath, { mime: JimpMime.png });
  return outPath;
}

export async function renderHtml(htmlPath, outPath, width = 900) {
  const { default: puppeteer } = await import('puppeteer');
  const absHtml = resolve(htmlPath);
  if (!existsSync(absHtml)) throw new Error(`HTML file not found: ${absHtml}`);

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1080, deviceScaleFactor: 3 });
    await page.goto(`file:///${absHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewport({ width, height: bodyHeight, deviceScaleFactor: 3 });
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await browser.close();
  }
  return outPath;
}
