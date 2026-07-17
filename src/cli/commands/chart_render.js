import { register } from '../router.js';
import { renderCandleChart } from '../../core/chart_render.js';

register('chart-render', {
  description: 'Render a clean candlestick chart PNG from OHLCV JSON + SL/TP/Entry levels',
  options: {
    data:       { type: 'string', description: 'Path to JSON file with OHLCV array [{time,open,high,low,close}]' },
    out:        { type: 'string', description: 'Output PNG path' },
    symbol:     { type: 'string', description: 'Symbol label e.g. XAUUSD' },
    tf:         { type: 'string', description: 'Timeframe label e.g. 15' },
    sl:         { type: 'string', description: 'Stop loss price' },
    tp1:        { type: 'string', description: 'Take profit 1' },
    tp2:        { type: 'string', description: 'Take profit 2' },
    tp3:        { type: 'string', description: 'Take profit 3' },
    'entry-low':  { type: 'string', description: 'Entry zone low price' },
    'entry-high': { type: 'string', description: 'Entry zone high price' },
    width:      { type: 'string', description: 'Image width px (default 1400)' },
    height:     { type: 'string', description: 'Image height px (default 800)' },
  },
  handler: async (opts) => {
    const { readFileSync } = await import('fs');
    const ohlcv = JSON.parse(readFileSync(opts.data, 'utf8'));
    const num = v => v != null ? parseFloat(v) : null;
    const entry = (opts['entry-low'] && opts['entry-high'])
      ? { low: num(opts['entry-low']), high: num(opts['entry-high']) }
      : null;

    const outPath = await renderCandleChart({
      ohlcv,
      symbol: opts.symbol || '',
      tf: opts.tf || '',
      entry,
      sl:  num(opts.sl),
      tp1: num(opts.tp1),
      tp2: num(opts.tp2),
      tp3: num(opts.tp3),
      outPath: opts.out,
      width:  opts.width  ? parseInt(opts.width)  : 1400,
      height: opts.height ? parseInt(opts.height) : 800,
    });

    console.log(JSON.stringify({ success: true, file_path: outPath }));
  },
});
