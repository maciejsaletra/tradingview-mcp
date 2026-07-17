/**
 * Renders a clean candlestick chart PNG from OHLCV data + SL/TP/Entry levels.
 * Uses Puppeteer + HTML5 Canvas — no TradingView, no indicators, dark theme.
 */
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(dirname(__dirname));

export async function renderCandleChart({
  ohlcv,          // array of { time, open, high, low, close }
  symbol = '',
  tf = '',
  entry,          // { low, high } or null
  sl = null,
  tp1 = null,
  tp2 = null,
  tp3 = null,
  outPath,
  width = 1400,
  height = 800,
} = {}) {
  const { default: puppeteer } = await import('puppeteer');

  mkdirSync(dirname(resolve(outPath)), { recursive: true });

  const html = buildChartHtml({ ohlcv, symbol, tf, entry, sl, tp1, tp2, tp3, width, height });

  // Write temp HTML
  const tmpHtml = join(REPO_ROOT, 'screenshots', '_chart_tmp.html');
  mkdirSync(dirname(tmpHtml), { recursive: true });
  writeFileSync(tmpHtml, html, 'utf8');

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.goto(`file:///${tmpHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: outPath, fullPage: false });
  } finally {
    await browser.close();
  }

  return outPath;
}

function buildChartHtml({ ohlcv, symbol, tf, entry, sl, tp1, tp2, tp3, width, height }) {
  const dataJson = JSON.stringify(ohlcv);
  const levelsJson = JSON.stringify({ entry: entry || null, sl, tp1, tp2, tp3 });
  const labelStr = `${symbol} · ${tf}m`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #131722; width: ${width}px; height: ${height}px; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<canvas id="c" width="${width}" height="${height}"></canvas>
<script>
(function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const W = ${width};
  const H = ${height};
  const ohlcv = ${dataJson};
  const levels = ${levelsJson};
  const label = ${JSON.stringify(labelStr)};

  // Layout
  const PAD_LEFT   = 12;
  const PAD_RIGHT  = 80;   // price axis
  const PAD_TOP    = 48;   // header
  const PAD_BOTTOM = 32;   // time axis
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  // Price range — include all candles + levels
  let priceMin = Math.min(...ohlcv.map(b => b.low));
  let priceMax = Math.max(...ohlcv.map(b => b.high));
  const allLevels = [levels.sl, levels.tp1, levels.tp2, levels.tp3,
    levels.entry?.low, levels.entry?.high].filter(v => v != null);
  if (allLevels.length) {
    priceMin = Math.min(priceMin, ...allLevels);
    priceMax = Math.max(priceMax, ...allLevels);
  }
  const pricePad = (priceMax - priceMin) * 0.08;
  priceMin -= pricePad;
  priceMax += pricePad;
  const priceRange = priceMax - priceMin;

  function py(price) {
    return PAD_TOP + chartH - ((price - priceMin) / priceRange) * chartH;
  }
  function px(i) {
    const candleW = chartW / ohlcv.length;
    return PAD_LEFT + i * candleW + candleW / 2;
  }
  function candleWidth(i) {
    const raw = (chartW / ohlcv.length) * 0.65;
    return Math.max(2, Math.min(16, raw));
  }

  // === BACKGROUND ===
  ctx.fillStyle = '#131722';
  ctx.fillRect(0, 0, W, H);

  // === GRID LINES (horizontal price) ===
  const gridCount = 8;
  ctx.strokeStyle = '#1e2a3a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridCount; i++) {
    const price = priceMin + (priceRange * i / gridCount);
    const y = py(price);
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(W - PAD_RIGHT, y);
    ctx.stroke();
  }

  // === PRICE AXIS (right) ===
  ctx.fillStyle = '#8b949e';
  ctx.font = '11px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i <= gridCount; i++) {
    const price = priceMin + (priceRange * i / gridCount);
    const y = py(price);
    ctx.fillText(price.toFixed(2), W - PAD_RIGHT + 6, y + 4);
  }

  // === CANDLES ===
  ohlcv.forEach((bar, i) => {
    const bull = bar.close >= bar.open;
    const color = bull ? '#26a69a' : '#ef5350';
    const cw = candleWidth(i);
    const x = px(i);

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, py(bar.high));
    ctx.lineTo(x, py(bar.low));
    ctx.stroke();

    // Body
    const bodyTop = py(Math.max(bar.open, bar.close));
    const bodyBot = py(Math.min(bar.open, bar.close));
    const bodyH = Math.max(1, bodyBot - bodyTop);
    ctx.fillStyle = color;
    ctx.fillRect(x - cw / 2, bodyTop, cw, bodyH);
  });

  // === LEVEL LINES ===
  function drawHLine(price, color, dash, lineW, text, textColor) {
    if (price == null) return;
    const y = py(price);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW || 1.5;
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(W - PAD_RIGHT, y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Label on right
    ctx.fillStyle = textColor || color;
    ctx.font = 'bold 11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text + '  ' + price.toFixed(2), W - PAD_RIGHT + 6, y - 3);
    ctx.restore();
  }

  // Entry zone (yellow rectangle)
  if (levels.entry) {
    const yTop = py(levels.entry.high);
    const yBot = py(levels.entry.low);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
    ctx.fillRect(PAD_LEFT, yTop, chartW, yBot - yTop);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(PAD_LEFT, yTop, chartW, yBot - yTop);
    ctx.setLineDash([]);
    // Axis label (short — full range is drawn inside the box)
    const midY = (yTop + yBot) / 2;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ENTRY', W - PAD_RIGHT + 6, midY + 4);
    // Zone label inside the box, reference-card style
    ctx.fillStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.font = 'bold 22px -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENTRY ZONE  ' + levels.entry.low.toFixed(2) + ' – ' + levels.entry.high.toFixed(2),
      PAD_LEFT + chartW / 2, midY + 8);
    ctx.restore();
  }

  drawHLine(levels.sl,  '#ef5350', [6, 3], 1.5, 'SL ',   '#ef5350');
  drawHLine(levels.tp1, '#26a69a', [],      2,   'TP1',   '#26a69a');
  drawHLine(levels.tp2, '#26a69a', [5, 4],  1.5, 'TP2',   '#26a69a');
  drawHLine(levels.tp3, '#26a69a', [2, 4],  1,   'TP3',   '#4db6ac');

  // === HEADER ===
  ctx.fillStyle = '#e6edf3';
  ctx.font = 'bold 15px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, PAD_LEFT + 4, 28);

  // Current price badge
  if (ohlcv.length > 0) {
    const last = ohlcv[ohlcv.length - 1];
    const priceStr = last.close.toFixed(2);
    const bull = last.close >= last.open;
    const bColor = bull ? '#26a69a' : '#ef5350';
    ctx.font = 'bold 13px -apple-system, Segoe UI, sans-serif';
    const tw = ctx.measureText(priceStr).width;
    ctx.fillStyle = bColor;
    ctx.fillRect(W - PAD_RIGHT - tw - 16, 10, tw + 14, 22);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(priceStr, W - PAD_RIGHT - 5, 26);
  }

  // Separator line under header
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, PAD_TOP - 4);
  ctx.lineTo(W, PAD_TOP - 4);
  ctx.stroke();

  // Watermark
  ctx.fillStyle = 'rgba(245,200,66,0.08)';
  ctx.font = 'bold 48px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TRW', W / 2, H / 2 + 16);

})();
</script>
</body>
</html>`;
}
