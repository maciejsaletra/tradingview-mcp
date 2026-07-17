const fs = require('fs');
const path = require('path');

const logoB64 = fs.readFileSync('screenshots/_logo_b64.txt', 'utf8').trim();
let html = fs.readFileSync('context/commercial_card_template.html', 'utf8');

const chartImgAbs = path.resolve('screenshots/xau/sig-088_chart.png');
const chartImgPath = 'file:///' + chartImgAbs.replace(/\\/g, '/');

const map = {
  '<LOGO_BASE64>': logoB64,
  '<TICKER>': 'XAUUSD',
  '<SUBTITLE>': 'Setup B continuation · pullback OTE 0.618 + FVG/BOS confluence',
  '<DIRECTION>': 'SELL',
  '<DIR_BG>': '#3a0f0f',
  '<DIR_TEXT>': '#f0997b',
  '<SESSION_LABEL>': 'London/NY · 15:47 UK',
  '<DATE>': '2026-07-16',
  '<CHART_IMG_PATH>': chartImgPath,
  '<ENTRY_LOW>': '4013',
  '<ENTRY_HIGH>': '4021',
  '<SL>': '4044',
  '<TP1>': '3975',
  '<TP2>': '3968',
  '<CONFIDENCE>': '82'
};

for (const [k, v] of Object.entries(map)) {
  html = html.split(k).join(v);
}

fs.writeFileSync('reports/daily/sig-088_commercial.html', html);
console.log('written');
