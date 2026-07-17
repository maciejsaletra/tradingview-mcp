import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/telegram.js';

const TOPICS = ['xau', 'waluty', 'indeksy', 'krypto', 'wyniki'];

export function registerTelegramTools(server) {
  server.tool('telegram_send_signal', 'Send a trading signal (chart screenshot + entry/SL/TP) to the configured Telegram group', {
    photoPath: z.string().describe('Absolute path to the screenshot PNG (e.g. from capture_screenshot file_path)'),
    symbol: z.string().describe('Symbol, e.g. XAUUSD'),
    tf: z.string().describe('Timeframe, e.g. M15, H1'),
    direction: z.string().describe('LONG or SHORT'),
    entry: z.string().describe('Entry zone, e.g. "4070-4085"'),
    sl: z.string().describe('Stop loss price'),
    tp1: z.string().optional().describe('Take profit 1'),
    tp2: z.string().optional().describe('Take profit 2'),
    tp3: z.string().optional().describe('Take profit 3'),
    probability: z.string().optional().describe('Probability percentage, e.g. "72"'),
    notes: z.string().optional().describe('Short note/context to include in the caption'),
    topic: z.enum(TOPICS).optional().describe('Which Telegram topic thread to post to: xau, waluty, indeksy, krypto, or wyniki. Falls back to the default signal thread if omitted.'),
  }, async (args) => {
    try { return jsonResult(await core.sendSignal(args)); }
    catch (err) { return jsonResult({ success: false, error: err.message, cause: err.cause?.message || err.cause }, true); }
  });

  server.tool('telegram_send_text', 'Send a plain Markdown text message (no photo) to a Telegram topic thread — used for EOD stats/summary posts', {
    text: z.string().describe('MarkdownV2-escaped message body'),
    topic: z.enum(TOPICS).optional().describe('Which Telegram topic thread to post to: xau, waluty, indeksy, krypto, or wyniki. Falls back to the default signal thread if omitted.'),
  }, async (args) => {
    try { return jsonResult(await core.sendText(args)); }
    catch (err) { return jsonResult({ success: false, error: err.message, cause: err.cause?.message || err.cause }, true); }
  });
}
