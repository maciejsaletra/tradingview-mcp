/**
 * Loads .env (if present) and exposes app config from process.env.
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

try {
  process.loadEnvFile(join(REPO_ROOT, '.env'));
} catch {
  // .env not present — fine, env vars may be set another way
}

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
export const TELEGRAM_SIGNAL_THREAD_ID = process.env.TELEGRAM_SIGNAL_THREAD_ID || '';

export const TELEGRAM_TOPIC_THREADS = {
  xau: process.env.TELEGRAM_THREAD_XAU || '',
  waluty: process.env.TELEGRAM_THREAD_WALUTY || '',
  indeksy: process.env.TELEGRAM_THREAD_INDEKSY || '',
  krypto: process.env.TELEGRAM_THREAD_KRYPTO || '',
  wyniki: process.env.TELEGRAM_THREAD_WYNIKI || '',
  plan: process.env.TELEGRAM_SIGNAL_THREAD_ID || '',
  // Swing signals (strategy_type/lifecycle = "swing") go to the dedicated "SWINGI H4/D1" topic
  // (thread 9), never to the instrument topics used by TOP3/XAU day-trading signals (rule 2026-07-18).
  swing: process.env.TELEGRAM_THREAD_SWING || '9',
};
