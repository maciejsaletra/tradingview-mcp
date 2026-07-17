import { register } from '../router.js';
import { composeCard, renderHtml, fillCarryoverTemplate, validateM15Screenshot, getSessionTag } from '../../core/card.js';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

register('card', {
  description: 'Compose a branded signal card (stamp TRW logo onto a chart screenshot, or render HTML to PNG)',
  subcommands: new Map([
    ['compose', {
      description: 'Stamp the TRW logo onto a chart screenshot, producing a branded PNG',
      options: {
        screenshot: { type: 'string', description: 'Path to the raw chart screenshot PNG' },
        out: { type: 'string', description: 'Output path for the branded PNG' },
      },
      handler: async (opts) => ({ success: true, path: await composeCard(opts.screenshot, opts.out) }),
    }],
    ['render', {
      description: 'Render an HTML signal card to a PNG image using Puppeteer',
      options: {
        html:  { type: 'string', description: 'Path to the HTML file to render' },
        out:   { type: 'string', description: 'Output path for the rendered PNG' },
        width: { type: 'string', description: 'Viewport width in px (default: 900)' },
      },
      handler: async (opts) => ({ success: true, path: await renderHtml(opts.html, opts.out, Number(opts.width) || 900) }),
    }],
    ['validate-screenshot', {
      description: 'Validate a screenshot against §7b M15 standard (filename, _meta.json, TF, entry_box, sl, tp)',
      options: {
        path: { type: 'string', description: 'Absolute or relative path to the screenshot PNG/JPG' },
      },
      handler: async (opts) => {
        if (!opts.path) throw new Error('--path required');
        const abs = resolve(opts.path);
        if (!existsSync(abs)) throw new Error(`File not found: ${abs}`);
        const result = validateM15Screenshot(abs);
        return {
          success: true,
          file: abs,
          valid: result.valid,
          issues: result.issues,
          verdict: result.valid
            ? '✓ Screenshot spełnia standard §7b M15 — gotowy do karty carry-over'
            : '✗ Screenshot NIE spełnia standardu §7b — nie użyj w karcie carry-over',
        };
      },
    }],
    ['fill-carryover', {
      description: 'Fill carry-over card template from active_setups.json + latest M15 screenshot, optionally render PNG',
      options: {
        id:           { type: 'string',  description: 'Setup ID, e.g. legacy-071 (required)' },
        out:          { type: 'string',  description: 'Output PNG path (optional; skips render if omitted)' },
        'out-html':   { type: 'string',  description: 'Output filled-HTML path (default: screenshots/<group>/<id>_filled.html)' },
        width:        { type: 'string',  description: 'Render width in px (default: 800)' },
        'tf-d1':      { type: 'string',  description: 'D1 TF description (Polish, from OHLCV)' },
        'tf-h4':      { type: 'string',  description: 'H4 TF description' },
        'tf-h1':      { type: 'string',  description: 'H1 TF description' },
        'tf-m15':     { type: 'string',  description: 'M15 TF description' },
        headline:     { type: 'string',  description: 'STATUS_HEADLINE text' },
        barwalk:      { type: 'string',  description: 'Bar-walk summary (1-2 sentences)' },
        'news-risk':  { type: 'string',  description: 'none | low | high' },
        'news-ctx':   { type: 'string',  description: 'News context note' },
        label:        { type: 'string',  description: 'SETUP_LABEL subtitle override' },
        datetime:     { type: 'string',  description: 'DATE_TIME override (default: now UTC), e.g. "2026-07-07 09:30 UTC"' },
        session:      { type: 'string',  description: 'Override session: asia | london | ny | off_session (default: auto from datetime)' },
        'm5-show':    { type: 'string',  description: 'Show M5 scalp section: true (default) | false' },
        'm5-entry':   { type: 'string',  description: 'M5 scalp entry level override, e.g. "4146–4163 od góry"' },
        'm5-sl':      { type: 'string',  description: 'M5 scalp SL override' },
        'm5-tp':      { type: 'string',  description: 'M5 scalp TP override' },
        'm5-status':  { type: 'string',  description: 'M5 scalp status: waiting (default) | taken | invalidated' },
        'm5-note':    { type: 'string',  description: 'M5 scalp note (1-2 zdania). Default: auto-generated from setup direction.' },
      },
      handler: async (opts) => {
        if (!opts.id) throw new Error('--id required (e.g. --id legacy-071)');

        // Build optional session override from --session flag
        const SESSION_MAP = {
          asia:        { tag: 'asia',        label: 'ASIA',        display: 'asia' },
          london:      { tag: 'london',      label: 'LONDYN',      display: 'londyn' },
          ny:          { tag: 'ny',          label: 'NEW YORK',    display: 'new york' },
          off_session: { tag: 'off_session', label: 'OFF-SESSION', display: 'off-session' },
        };
        const sessionOverride = opts.session ? (SESSION_MAP[opts.session.toLowerCase()] ?? null) : null;
        const m5Show = opts['m5-show'] === 'false' ? false : true;

        return fillCarryoverTemplate(opts.id, {
          outHtmlPath:   opts['out-html'] || null,
          outPngPath:    opts.out || null,
          width:         Number(opts.width) || 800,
          tfD1:          opts['tf-d1']     || null,
          tfH4:          opts['tf-h4']     || null,
          tfH1:          opts['tf-h1']     || null,
          tfM15:         opts['tf-m15']    || null,
          statusHeadline: opts.headline   || null,
          barwalkText:   opts.barwalk      || null,
          newsRisk:      opts['news-risk'] || null,
          newsContext:   opts['news-ctx']  || null,
          setupLabel:     opts.label        || null,
          dateTime:       opts.datetime     || null,
          sessionOverride,
          m5Show,
          m5Entry:   opts['m5-entry']  || null,
          m5Sl:      opts['m5-sl']     || null,
          m5Tp:      opts['m5-tp']     || null,
          m5Status:  opts['m5-status'] || 'waiting',
          m5Note:    opts['m5-note']   || null,
        });
      },
    }],
  ]),
});
