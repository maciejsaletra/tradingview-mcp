/**
 * Telegram signal delivery — sends a chart screenshot + structured
 * entry/SL/TP caption to the TRW Telegram group, and logs the send
 * to trade_log.md.
 */
import { readFileSync, existsSync, appendFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_SIGNAL_THREAD_ID, TELEGRAM_TOPIC_THREADS } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(dirname(__dirname));
const TRADE_LOG_PATH = join(REPO_ROOT, 'trade_log.md');

function escapeMd(text) {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

export function formatCaption({ symbol, tf, direction, entry, sl, tp1, tp2, tp3, probability, notes }) {
  const dirLabel = String(direction || '').toUpperCase();
  const dirEmoji = dirLabel === 'LONG' ? '🟢' : dirLabel === 'SHORT' ? '🔴' : '⚪';
  const lines = [
    `${dirEmoji} *${escapeMd(symbol)}* — *${escapeMd(dirLabel)}*`,
    `TF: ${escapeMd(tf)}`,
    '',
    `Entry: \`${escapeMd(entry)}\``,
    `SL: \`${escapeMd(sl)}\``,
  ];
  if (tp1 !== undefined && tp1 !== null && tp1 !== '') lines.push(`TP1: \`${escapeMd(tp1)}\``);
  if (tp2 !== undefined && tp2 !== null && tp2 !== '') lines.push(`TP2: \`${escapeMd(tp2)}\``);
  if (tp3 !== undefined && tp3 !== null && tp3 !== '') lines.push(`TP3: \`${escapeMd(tp3)}\``);
  if (probability !== undefined && probability !== null && probability !== '') {
    lines.push('', `Probability: *${escapeMd(probability)}%*`);
  }
  if (notes) lines.push('', escapeMd(notes));
  lines.push('', '_Trading Room Workshop · nie jest to porada inwestycyjna_');
  return lines.join('\n');
}

export async function sendSignal({ photoPath, symbol, tf, direction, entry, sl, tp1, tp2, tp3, probability, notes, topic }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { success: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — set them in .env' };
  }
  if (!photoPath || !existsSync(photoPath)) {
    return { success: false, error: `Photo not found: ${photoPath}` };
  }

  const threadId = (topic && TELEGRAM_TOPIC_THREADS[topic]) || TELEGRAM_SIGNAL_THREAD_ID;

  const caption = formatCaption({ symbol, tf, direction, entry, sl, tp1, tp2, tp3, probability, notes });

  const form = new FormData();
  form.append('chat_id', TELEGRAM_CHAT_ID);
  if (threadId) form.append('message_thread_id', threadId);
  form.append('caption', caption);
  form.append('parse_mode', 'MarkdownV2');
  const fileBuffer = readFileSync(photoPath);
  form.append('photo', new Blob([fileBuffer], { type: 'image/png' }), basename(photoPath));

  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
  const data = await resp.json();

  if (!data.ok) {
    return { success: false, error: data.description || 'Telegram API error' };
  }

  appendTradeLogRow({ symbol, tf, direction, entry, sl, tp1, tp2, tp3, probability, notes });

  return { success: true, message_id: data.result.message_id, chat_id: TELEGRAM_CHAT_ID };
}

export async function sendDocument({ photoPath, caption, topic }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { success: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — set them in .env' };
  }
  if (!photoPath || !existsSync(photoPath)) {
    return { success: false, error: `Photo not found: ${photoPath}` };
  }

  const threadId = (topic && TELEGRAM_TOPIC_THREADS[topic]) || TELEGRAM_SIGNAL_THREAD_ID;

  const form = new FormData();
  form.append('chat_id', TELEGRAM_CHAT_ID);
  if (threadId) form.append('message_thread_id', threadId);
  if (caption) {
    form.append('caption', caption);
    form.append('parse_mode', 'MarkdownV2');
  }
  const fileBuffer = readFileSync(photoPath);
  form.append('document', new Blob([fileBuffer], { type: 'image/png' }), basename(photoPath));

  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: form,
  });
  const data = await resp.json();

  if (!data.ok) {
    return { success: false, error: data.description || 'Telegram API error' };
  }

  return { success: true, message_id: data.result.message_id, chat_id: TELEGRAM_CHAT_ID };
}

export async function sendText({ text, topic }) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { success: false, error: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID — set them in .env' };
  }
  if (!text) {
    return { success: false, error: 'text is required' };
  }

  const threadId = (topic && TELEGRAM_TOPIC_THREADS[topic]) || TELEGRAM_SIGNAL_THREAD_ID;

  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'MarkdownV2',
  };
  if (threadId) body.message_thread_id = threadId;

  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();

  if (!data.ok) {
    return { success: false, error: data.description || 'Telegram API error' };
  }

  return { success: true, message_id: data.result.message_id, chat_id: TELEGRAM_CHAT_ID };
}

export function appendTradeLogRow({ symbol, tf, direction, entry, sl, tp1, tp2, tp3, probability, notes }) {
  if (!existsSync(TRADE_LOG_PATH)) return;
  // Matches trade_log.md columns: Date/Time | Symbol | TF | Setup | Entry | SL | TP1 | TP2 | Prob% | Outcome | RR | Notes
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const fullNote = tp3 ? `Sent to Telegram. TP3: ${tp3}.${notes ? ' ' + notes : ''}` : `Sent to Telegram.${notes ? ' ' + notes : ''}`;
  const row = `| ${date} | ${symbol} | ${tf} | ${direction} setup | ${entry} | ${sl} | ${tp1 ?? '—'} | ${tp2 ?? '—'} | ${probability ?? '—'} | pending | — | ${fullNote} |`;

  const content = readFileSync(TRADE_LOG_PATH, 'utf8');
  const summaryHeading = '\n## Weekly/EOD Summary';
  const idx = content.indexOf(summaryHeading);
  if (idx === -1) {
    appendFileSync(TRADE_LOG_PATH, row + '\n');
    return;
  }
  const before = content.slice(0, idx).replace(/\n+$/, '\n');
  const after = content.slice(idx);
  writeFileSync(TRADE_LOG_PATH, before + row + '\n' + after);
}
