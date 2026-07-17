import { register } from '../router.js';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateM15Screenshot, getSessionTag } from '../../core/card.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

function check(id, label, pass, detail = '') {
  return { id, label, status: pass ? 'pass' : 'fail', detail };
}
function warn(id, label, detail = '') {
  return { id, label, status: 'warn', detail };
}

register('prestart-check', {
  description: 'Run automated pre-start checklist (§7b pipeline, memory, setups, scheduler). See PRESTART_CHECKLIST.md.',
  options: {
    id: { type: 'string', description: 'Active setup ID to check screenshot for (default: first active setup)' },
  },
  handler: async (opts) => {
    const results = [];

    // ── §2 Pipeline / screenshots ─────────────────────────────────────────────

    // Logo file
    const logoPath = join(REPO_ROOT, 'assets', 'trw_logo.jpg');
    results.push(check('logo_file', 'assets/trw_logo.jpg exists', existsSync(logoPath), logoPath));

    // active_setups.json
    const setupsPath = join(REPO_ROOT, 'memory', 'active_setups.json');
    let setups = [];
    if (existsSync(setupsPath)) {
      try {
        const data = JSON.parse(readFileSync(setupsPath, 'utf8'));
        setups = data.active_setups || [];
      } catch { /* handled below */ }
    }
    results.push(check('setups_file', 'memory/active_setups.json readable', setups.length >= 0,
      setups.length === 0 ? 'brak aktywnych setupów' : `${setups.length} setup(y)`));

    const activeSetups = setups.filter(s => ['active', 'pending', 'triggered'].includes(s.lifecycle));
    results.push(check('setups_active', 'Co najmniej 1 aktywny/pending setup', activeSetups.length > 0,
      activeSetups.length === 0 ? 'brak — sprawdź active_setups.json' : activeSetups.map(s => s.id).join(', ')));

    // Screenshot check for specific setup
    const targetId = opts.id || (activeSetups[0] && activeSetups[0].id);
    if (targetId) {
      const setup = setups.find(s => s.id === targetId);
      if (setup) {
        const hasPath = !!setup.screenshot_m15_path;
        results.push(check('screenshot_path', `${targetId}: screenshot_m15_path ustawiony`, hasPath,
          hasPath ? setup.screenshot_m15_path : 'null — uruchom §7b bar-walk'));

        if (hasPath) {
          const absPath = join(REPO_ROOT, setup.screenshot_m15_path);
          const fileExists = existsSync(absPath);
          results.push(check('screenshot_file', `${targetId}: plik screenshota istnieje`, fileExists, absPath));

          if (fileExists) {
            const v = validateM15Screenshot(absPath);
            results.push(check('screenshot_valid', `${targetId}: validateM15Screenshot == true`, v.valid,
              v.valid ? 'M15 standard OK (TF=15, entry_box, sl, tp)' : v.issues.join('; ')));
          }
        }
      }
    }

    // Template file
    const templatePath = join(REPO_ROOT, 'context', 'carryover_card_template.html');
    const templateOk = existsSync(templatePath);
    let templateHasPlanLabel = false;
    if (templateOk) {
      const content = readFileSync(templatePath, 'utf8');
      templateHasPlanLabel = content.includes('PLAN <SESSION_LABEL>');
    }
    results.push(check('template_plan_label', 'Template używa PLAN <SESSION_LABEL> (nie STATUS CARRY-OVER)',
      templateHasPlanLabel, templatePath));

    // ── §3 Memory ─────────────────────────────────────────────────────────────
    // Claude auto-memory lives in ~/.claude/projects/<slug>/memory/
    // Project slug = repo path with \ replaced by - and drive colon removed
    const homedir = process.env.USERPROFILE || process.env.HOME || '';
    // Claude memory slug: C:\Users\Magic\foo → C--Users-Magic-foo  (: first, then \)
    const projectSlug = REPO_ROOT.replace(/:/g, '-').replace(/\\/g, '-');
    const claudeMemDir  = join(homedir, '.claude', 'projects', projectSlug, 'memory');
    const claudeMemoryMd = join(claudeMemDir, 'MEMORY.md');
    let memContent = '';
    if (existsSync(claudeMemoryMd)) memContent = readFileSync(claudeMemoryMd, 'utf8');

    const fiboFile = join(claudeMemDir, 'feedback_fibonacci_gold.md');
    results.push(check('memory_fibo_file', 'feedback_fibonacci_gold.md istnieje (Claude memory)',
      existsSync(fiboFile), existsSync(fiboFile) ? fiboFile : claudeMemDir + ' — brak pliku'));

    results.push(check('memory_fibonacci', 'MEMORY.md: feedback_fibonacci_gold wpisany',
      memContent.includes('feedback_fibonacci_gold'), 'Fibo 0.618/1.272/1.618 dla złota'));

    results.push(check('memory_london_time', 'MEMORY.md: London time / BST/GMT wpisany',
      memContent.includes('BST') || memContent.includes('London time') || memContent.includes('BST/GMT'),
      'UTC→BST display'));

    results.push(check('memory_m5_scalp', 'MEMORY.md: M5 scalp wpisany',
      memContent.includes('M5 scalp') || memContent.includes('scalp_module') || memContent.includes('scalp module'),
      'M5 scalp module'));

    // ── §4 Scheduler logs ─────────────────────────────────────────────────────

    const logsDir = join(REPO_ROOT, 'journal');
    if (existsSync(logsDir)) {
      const logFiles = readdirSync(logsDir)
        .filter(f => f.endsWith('.jsonl') || f.endsWith('.md'))
        .sort().reverse().slice(0, 3);
      results.push(warn('scheduler_logs', 'Sprawdź logi manualnie — ostatnie pliki journal/',
        logFiles.length > 0 ? logFiles.join(', ') : 'brak plików'));
    }

    // ── §1 Session time ───────────────────────────────────────────────────────

    const now = new Date();
    const session = getSessionTag(now);
    const londonParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now);
    const lHH = londonParts.find(p => p.type === 'hour').value;
    const lMM = londonParts.find(p => p.type === 'minute').value;
    const utcHH = String(now.getUTCHours()).padStart(2, '0');
    const utcMM = String(now.getUTCMinutes()).padStart(2, '0');
    const offset = ((parseInt(lHH) - now.getUTCHours()) + 24) % 24;
    const tzSuffix = offset === 1 ? 'BST' : 'GMT';

    results.push({
      id: 'session_time',
      label: 'Aktualna sesja i czas',
      status: 'info',
      detail: `UTC ${utcHH}:${utcMM} → ${lHH}:${lMM} ${tzSuffix} | sesja: ${session.label} (${session.tag})`,
    });

    // ── Summary ───────────────────────────────────────────────────────────────

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warn').length;

    const manualChecks = [
      '[ ] Internet / TradingView Desktop / CDP port 9222 działa (tv_health_check)',
      '[ ] Czas systemowy zgodny z UTC',
      '[ ] Brak high-impact news w pierwszej godzinie sesji (ForexFactory)',
      `[ ] Bias GOLD (D1/H4) potwierdzony — setup ${targetId || '?'} nadal ważny`,
      `[ ] Entry box (4146.73–4163.06) świeży — cena nie naruszyła M15 close inside`,
      '[ ] Logi schedulera: brak "failed job" / timeout w ostatnim runie',
    ];

    return {
      success: failed === 0,
      summary: `${passed} pass · ${failed} fail · ${warnings} warn`,
      session: `${session.label} | UTC ${utcHH}:${utcMM} → ${lHH}:${lMM} ${tzSuffix}`,
      checks: results,
      manual_checklist: manualChecks,
      next: failed > 0
        ? 'FIX wymagany — patrz pole "checks" wyżej, napraw zanim uruchomisz automat.'
        : 'AUTO-CHECKS: OK. Potwierdź pozycje manualne z listy powyżej.',
    };
  },
});
