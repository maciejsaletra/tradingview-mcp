import { register } from '../router.js';
import * as core from '../../core/telegram.js';

function escapeMd(text) {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

register('telegram', {
  description: 'Send a trading signal to the configured Telegram group',
  subcommands: new Map([
    ['send', {
      description: 'Send a chart screenshot + entry/SL/TP signal to Telegram',
      options: {
        photo: { type: 'string', description: 'Path to screenshot PNG' },
        symbol: { type: 'string', description: 'Symbol, e.g. XAUUSD' },
        tf: { type: 'string', description: 'Timeframe, e.g. M15' },
        direction: { type: 'string', description: 'LONG or SHORT' },
        entry: { type: 'string', description: 'Entry zone' },
        sl: { type: 'string', description: 'Stop loss' },
        tp1: { type: 'string', description: 'Take profit 1' },
        tp2: { type: 'string', description: 'Take profit 2' },
        tp3: { type: 'string', description: 'Take profit 3' },
        probability: { type: 'string', description: 'Probability %' },
        notes: { type: 'string', description: 'Short note' },
        topic: { type: 'string', description: 'Topic thread: xau, waluty, indeksy, krypto, wyniki' },
      },
      handler: (opts) => core.sendSignal({
        photoPath: opts.photo,
        symbol: opts.symbol,
        tf: opts.tf,
        direction: opts.direction,
        entry: opts.entry,
        sl: opts.sl,
        tp1: opts.tp1,
        tp2: opts.tp2,
        tp3: opts.tp3,
        probability: opts.probability,
        notes: opts.notes,
        topic: opts.topic,
      }),
    }],
    ['send-doc', {
      description: 'Send a PNG as a document (full quality, no compression) with a short caption',
      options: {
        photo: { type: 'string', description: 'Path to PNG file' },
        caption: { type: 'string', description: 'Short caption text (plain, will be escaped)' },
        topic: { type: 'string', description: 'Topic thread: xau, waluty, indeksy, krypto, wyniki, plan' },
      },
      handler: (opts) => core.sendDocument({
        photoPath: opts.photo,
        caption: opts.caption ? escapeMd(opts.caption) : undefined,
        topic: opts.topic,
      }),
    }],
    ['send-text', {
      description: 'Send a plain text message to a Telegram topic thread (e.g. EOD stats)',
      options: {
        text: { type: 'string', description: 'MarkdownV2-escaped message body' },
        topic: { type: 'string', description: 'Topic thread: xau, waluty, indeksy, krypto, wyniki' },
      },
      handler: (opts) => core.sendText({ text: opts.text, topic: opts.topic }),
    }],
  ]),
});
