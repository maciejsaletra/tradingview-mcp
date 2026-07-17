/**
 * tv auto-review — Automatic reviewer for TRW routines.
 *
 * Checks §7b screenshot, PLAN card, M5 scalp, scoring, Fibo, London time, logo, MEMORY.
 * Returns AUTO-APPROVED (all pass) or REQUIRES REVIEW (with itemised fix list).
 *
 * Usage:
 *   tv auto-review --id legacy-071
 *   tv auto-review --id legacy-071 --html screenshots/xau/legacy-071_filled.html
 */
import { register } from '../router.js';
import { existsSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateM15Screenshot } from '../../core/card.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

// ─── helpers ─────────────────────────────────────────────────────────────────

function fail(category, description) { return { status: 'fail', category, description }; }
function pass(category, description) { return { status: 'pass', category, description }; }
function warn(category, description) { return { status: 'warn', category, description }; }

function getClaudeMemDir() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const slug  = REPO_ROOT.replace(/:/g, '-').replace(/\\/g, '-');
  return join(home, '.claude', 'projects', slug, 'memory');
}

// ─── register ────────────────────────────────────────────────────────────────

register('auto-review', {
  description: 'Automatic reviewer for TRW routines. Returns AUTO-APPROVED or REQUIRES REVIEW with itemised fix list.',
  options: {
    id:   { type: 'string', description: 'Setup ID to review (default: first active/triggered setup)' },
    html: { type: 'string', description: 'Path to generated _filled.html (default: auto-discovered)' },
  },
  handler: async (opts) => {
    const items = [];   // { status, category, description }

    // ─── 0. Load setup ───────────────────────────────────────────────────────
    const setupsPath = join(REPO_ROOT, 'memory', 'active_setups.json');
    if (!existsSync(setupsPath)) {
      return buildResult([fail('SETUP', 'memory/active_setups.json nie istnieje')], null, null, null);
    }

    const allSetups = JSON.parse(readFileSync(setupsPath, 'utf8')).active_setups || [];
    const targetId  = opts.id
      || allSetups.find(s => ['active', 'triggered', 'pending'].includes(s.lifecycle))?.id;

    if (!targetId) {
      return buildResult([fail('SETUP', 'Brak aktywnego setupu — sprawdź active_setups.json')], null, null, null);
    }

    const setup = allSetups.find(s => s.id === targetId);
    if (!setup) {
      return buildResult([fail('SETUP', `Setup '${targetId}' nie znaleziony`)], null, null, null);
    }

    const instrument = (setup.instrument || '').toUpperCase();
    const dir        = setup.direction  || 'LONG';
    const isGold     = instrument.includes('XAU') || instrument.includes('GOLD');

    // ─── 1. Screenshot §7b ───────────────────────────────────────────────────
    if (!setup.screenshot_m15_path) {
      items.push(fail('SCREENSHOT', 'screenshot_m15_path == null — uruchom §7b bar-walk'));
    } else {
      const abs = join(REPO_ROOT, setup.screenshot_m15_path);
      if (!existsSync(abs)) {
        items.push(fail('SCREENSHOT', `Plik nie istnieje: ${setup.screenshot_m15_path}`));
      } else {
        const v = validateM15Screenshot(abs);
        if (v.valid) {
          items.push(pass('SCREENSHOT', `${setup.screenshot_m15_path} — M15 standard OK`));
        } else {
          v.issues.forEach(i => items.push(fail('SCREENSHOT', i)));
        }
      }
    }

    // ─── 2. Logo ─────────────────────────────────────────────────────────────
    const logoPath = join(REPO_ROOT, 'assets', 'trw_logo.jpg');
    if (!existsSync(logoPath)) {
      items.push(fail('LOGO', 'assets/trw_logo.jpg nie istnieje'));
    } else {
      items.push(pass('LOGO', 'assets/trw_logo.jpg istnieje'));
    }

    // ─── 3. Template checks ──────────────────────────────────────────────────
    const tplPath = join(REPO_ROOT, 'context', 'carryover_card_template.html');
    if (!existsSync(tplPath)) {
      items.push(fail('TEMPLATE', 'context/carryover_card_template.html nie istnieje'));
    } else {
      const tpl = readFileSync(tplPath, 'utf8');
      if (!tpl.includes('PLAN <SESSION_LABEL>'))
        items.push(fail('PLAN_HEADER', 'Template nie zawiera "PLAN <SESSION_LABEL>" — stary header?'));
      else
        items.push(pass('PLAN_HEADER', 'Template: PLAN <SESSION_LABEL> OK'));

      if (!tpl.includes('<DATE_TIME_LONDON>'))
        items.push(fail('LONDON_TIME', 'Template nie używa <DATE_TIME_LONDON> — brak London time display'));
      else
        items.push(pass('LONDON_TIME', 'Template: <DATE_TIME_LONDON> OK'));

      if (!tpl.includes('<M5_SCALP_BLOCK>'))
        items.push(fail('M5_SCALP', 'Template nie zawiera <M5_SCALP_BLOCK>'));
      else
        items.push(pass('M5_SCALP', 'Template: <M5_SCALP_BLOCK> OK'));

      if (!tpl.includes('<LOGO_BLOCK>'))
        items.push(fail('LOGO', 'Template nie używa <LOGO_BLOCK> — logo może być hardcoded'));
      else
        items.push(pass('LOGO', 'Template: <LOGO_BLOCK> OK'));
    }

    // ─── 4. Generated HTML card ──────────────────────────────────────────────
    const htmlPath = opts.html
      ? resolve(opts.html)
      : join(REPO_ROOT, 'screenshots', setup.group || 'xau', `${targetId}_filled.html`);

    if (!existsSync(htmlPath)) {
      items.push(fail('PLAN_CARD', `Wygenerowany HTML nie istnieje: ${htmlPath} — uruchom tv card fill-carryover`));
    } else {
      const html = readFileSync(htmlPath, 'utf8');

      // PLAN header in output
      const planMatch = html.match(/PLAN (ASIA|LONDYN|NEW YORK|OFF-SESSION)/);
      if (!planMatch)
        items.push(fail('PLAN_HEADER', 'HTML nie zawiera "PLAN ASIA/LONDYN/NEW YORK/OFF-SESSION"'));
      else
        items.push(pass('PLAN_HEADER', `HTML: ${planMatch[0]} OK`));

      // London time in subtitle
      if (!/UTC \d{2}:\d{2} → \d{2}:\d{2} (BST|GMT)/.test(html))
        items.push(fail('LONDON_TIME', 'Podtytuł nie zawiera formatu "UTC HH:MM → HH:MM BST/GMT"'));
      else
        items.push(pass('LONDON_TIME', 'HTML: UTC→BST/GMT format OK'));

      // Session chip — accepts both tag (london/ny/off_session) and display (londyn/new york/off-session)
      if (!/(session:.*?)(asia|london|londyn|ny|new york|off.session)/i.test(html))
        items.push(fail('SESSION_TAG', 'Pole systemowe "session:" nie ma prawidłowego tagu (asia/london/ny/off_session)'));
      else
        items.push(pass('SESSION_TAG', 'HTML: session chip OK'));

      // M5 section — either "Dzień dobry – M5 scalp trade" (real scalp setup exists)
      // or "Plan retestu M5" (intraday entry plan from the swing setup)
      const hasM5 = html.includes('Dzie&#324; dobry') || html.includes('Dzień dobry')
                 || html.includes('Plan retestu M5');
      if (!hasM5)
        items.push(fail('M5_SCALP', 'Sekcja M5 (scalp lub plan retestu) nieobecna w HTML'));
      else
        items.push(pass('M5_SCALP', 'HTML: sekcja M5 OK'));

      // M5 scalp has status
      if (hasM5 && !/(m5-status-waiting|m5-status-taken|m5-status-invalidated)/.test(html))
        items.push(fail('M5_SCALP', 'M5 scalp nie ma statusu (waiting/taken/invalidated)'));

      // M5 scalp bias coherence: note must not contradict setup direction
      const m5NoteMatch = html.match(/class="m5-note"[^>]*>([^<]+)/);
      if (m5NoteMatch) {
        const note = m5NoteMatch[1].toLowerCase();
        if (dir === 'LONG' && note.includes('short') && !note.includes('short term'))
          items.push(fail('M5_SCALP', `Opis M5 scalp zawiera "short" — setup LONG. Sprawdź spójność biasu.`));
        if (dir === 'SHORT' && note.includes('long') && !note.includes('long term'))
          items.push(fail('M5_SCALP', `Opis M5 scalp zawiera "long" — setup SHORT. Sprawdź spójność biasu.`));
      }

      // Confidence chip
      const confHtml = html.match(/class="(conf-high|conf-mid|conf-low)"[^>]*>(\d+)%/);
      if (!confHtml)
        items.push(fail('CONFIDENCE', 'Brak chipu confidence (conf-high/mid/low) w Polach systemowych'));
      else
        items.push(pass('CONFIDENCE', `HTML: confidence chip "${confHtml[1]}" (${confHtml[2]}%) OK`));
    }

    // ─── 5. Scoring / confidence values ──────────────────────────────────────
    // Canon = ROUTINES_V2 §8: checklist 0–100 (HTF 0–40 + LTF 0–30 + RR 0–20 + news 0–10),
    // tiers 70–79 / 80–89 / 90–100, publish ≥70, cap 100 (scalp 80).
    const conf = typeof setup.confidence === 'number' ? setup.confidence : null;
    const reason = (setup.reason_short || '').toLowerCase();
    const hasConfluence = ['fib', '0.618', 'confluence', 'liquidity', 'sweep', 'bsl', 'ssl', 'ob '].some(k => reason.includes(k));
    if (conf === null) {
      items.push(fail('CONFIDENCE', 'confidence == null w active_setups.json — uzupełnij'));
    } else if (conf > 100) {
      items.push(fail('CONFIDENCE', `confidence=${conf}% przekracza cap 100 (§8)`));
    } else if (conf < 55) {
      items.push(fail('CONFIDENCE', `confidence=${conf}% poniżej 55% — czy setup spełnia minimalne warunki publikacji (≥70%)?`));
    } else if (conf >= 75 && !hasConfluence) {
      items.push(fail('CONFIDENCE', `confidence=${conf}% (≥75%) bez widocznej konfluencji w reason_short — podaj uzasadnienie (Fibo/liquidity/sweep)`));
    } else if (conf > 85) {
      items.push(warn('CONFIDENCE', `confidence=${conf}% w tierze 86–100 (§8: exceptional) — upewnij się, że reason_short wymienia czynniki, które to uzasadniają`));
    } else if (conf >= 75) {
      items.push(pass('CONFIDENCE', `confidence=${conf}% — konfluencja w reason_short OK`));
    } else {
      items.push(pass('CONFIDENCE', `confidence=${conf}% — w dopuszczalnym zakresie (55–74%)`));
    }

    // ─── 6. Fibo GOLD ────────────────────────────────────────────────────────
    if (isGold) {
      const memDir  = getClaudeMemDir();
      const fiboFile = join(memDir, 'feedback_fibonacci_gold.md');
      if (!existsSync(fiboFile)) {
        items.push(fail('FIBO_GOLD', 'feedback_fibonacci_gold.md nie istnieje w Claude memory'));
      } else {
        const fc = readFileSync(fiboFile, 'utf8');
        if (fc.includes('0.618') && fc.includes('1.272') && fc.includes('1.618'))
          items.push(pass('FIBO_GOLD', 'feedback_fibonacci_gold.md: poziomy 0.618/1.272/1.618 OK'));
        else
          items.push(fail('FIBO_GOLD', 'feedback_fibonacci_gold.md nie zawiera wszystkich poziomów (0.618/1.272/1.618)'));
      }

      // Fibo is an additive bonus, not an entry requirement (feedback_fibonacci_gold) —
      // missing annotation is a reminder (warn), not a blocker.
      if (!reason.includes('fib') && !reason.includes('0.618') && !reason.includes('confluence')) {
        items.push(warn('FIBO_GOLD', `GOLD setup — reason_short nie wspomina Fibo/confluence. Dodaj adnotację (entry przy 0.618, TP przy 1.272/1.618) jeśli dotyczy.`));
      } else {
        items.push(pass('FIBO_GOLD', 'reason_short: adnotacja Fibo/confluence OK'));
      }
    }

    // ─── 7. MEMORY ───────────────────────────────────────────────────────────
    const memDir   = getClaudeMemDir();
    const memoryMd = join(memDir, 'MEMORY.md');
    if (!existsSync(memoryMd)) {
      items.push(fail('MEMORY', 'MEMORY.md nie istnieje w Claude memory directory'));
    } else {
      const mc = readFileSync(memoryMd, 'utf8');
      if (!mc.includes('feedback_fibonacci_gold'))
        items.push(fail('MEMORY', 'MEMORY.md: brak wpisu feedback_fibonacci_gold'));
      else
        items.push(pass('MEMORY', 'MEMORY.md: Fibo gold OK'));

      if (!mc.includes('BST') && !mc.includes('London time') && !mc.includes('BST/GMT'))
        items.push(fail('MEMORY', 'MEMORY.md: brak wpisu o czasie londyńskim (BST/GMT)'));
      else
        items.push(pass('MEMORY', 'MEMORY.md: London time OK'));

      if (!mc.includes('M5 scalp') && !mc.includes('scalp module') && !mc.includes('scalp_module'))
        items.push(fail('MEMORY', 'MEMORY.md: brak wpisu o M5 scalp module'));
      else
        items.push(pass('MEMORY', 'MEMORY.md: M5 scalp OK'));
    }

    return buildResult(items, targetId, setup, htmlPath);
  },
});

// ─── result builder ──────────────────────────────────────────────────────────

function buildResult(items, setupId, setup, htmlPath) {
  const failures = items.filter(i => i.status === 'fail');
  const warnings = items.filter(i => i.status === 'warn')
    .map(i => `[${i.category}] ${i.description}`);

  if (failures.length === 0) {
    const dir  = setup?.direction   || '?';
    const conf = setup?.confidence  ?? '?';
    const htmlExists = htmlPath && existsSync(htmlPath);
    let planLabel = 'PLAN ?';
    if (htmlExists) {
      const html = readFileSync(htmlPath, 'utf8');
      // Match specifically inside card-title div to skip comments like "PLAN ASIA / PLAN LONDYN / ..."
      const m = html.match(/card-title[^>]*>PLAN (ASIA|LONDYN|NEW YORK|OFF-SESSION)/);
      if (m) planLabel = `PLAN ${m[1]}`;
    }
    return {
      success: true,
      status:  'AUTO-APPROVED',
      note:    `Auto-checks OK. ${planLabel}, M15 standard screen, sekcja M5, scoring spójny (confidence ${conf}%, ${dir}).`,
      setup_id: setupId,
      passed:  items.filter(i => i.status === 'pass').length,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  return {
    success:      false,
    status:       'REQUIRES REVIEW',
    issues_count: failures.length,
    issues:       failures.map(i => `[${i.category}] ${i.description}`),
    ...(warnings.length > 0 ? { warnings } : {}),
    setup_id:     setupId,
    passed:       items.filter(i => i.status === 'pass').length,
    next:         'Napraw powyższe pozycje, uruchom fill-carryover ponownie, a następnie tv auto-review.',
  };
}
