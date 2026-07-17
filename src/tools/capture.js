import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/capture.js';

export function registerCaptureTools(server) {
  server.tool('capture_screenshot', 'Take a screenshot of the TradingView chart', {
    region: z.string().optional().describe('Region to capture: full, chart, strategy_tester (default full)'),
    filename: z.string().optional().describe('Custom filename (without extension)'),
    method: z.string().optional().describe('Capture method: cdp (Page.captureScreenshot) or api (chartWidgetCollection.takeScreenshot) (default cdp)'),
    scale: z.number().optional().describe('Pixel scale multiplier for higher resolution: 1, 2 (default), 3. Higher = sharper but larger file.'),
  }, async ({ region, filename, method, scale }) => {
    try { return jsonResult(await core.captureScreenshot({ region, filename, method, scale })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });
}
