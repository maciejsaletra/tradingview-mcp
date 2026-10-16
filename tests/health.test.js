/**
 * Unit tests for src/core/health.js (healthCheck, discover, uiState, launch).
 * Uses dependency injection (_deps) to avoid real CDP connections.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { healthCheck, discover, uiState, launch } from '../src/core/health.js';

// ── Mock helpers ─────────────────────────────────────────────────────────────

function mockDeps(overrides = {}) {
  return {
    getClient: async () => ({}),
    getTargetInfo: async () => ({ id: 'target-1', url: 'https://www.tradingview.com/chart/', title: 'TradingView' }),
    evaluate: async () => null,
    existsSync: () => false,
    execSync: () => { throw new Error('not found'); },
    spawn: () => { throw new Error('spawn not called'); },
    ...overrides,
  };
}

// ── healthCheck() ─────────────────────────────────────────────────────────────

describe('healthCheck()', () => {
  it('returns success with chart state when API is available', async () => {
    const deps = mockDeps({
      evaluate: async () => ({
        url: 'https://www.tradingview.com/chart/',
        title: 'TradingView',
        symbol: 'AAPL',
        resolution: '60',
        chartType: 1,
        apiAvailable: true,
      }),
    });
    const result = await healthCheck({ _deps: deps });
    assert.equal(result.success, true);
    assert.equal(result.cdp_connected, true);
    assert.equal(result.chart_symbol, 'AAPL');
    assert.equal(result.chart_resolution, '60');
    assert.equal(result.chart_type, 1);
    assert.equal(result.api_available, true);
    assert.equal(result.target_id, 'target-1');
  });

  it('returns unknown values when chart API is unavailable', async () => {
    const deps = mockDeps({
      evaluate: async () => ({
        url: 'https://www.tradingview.com/chart/',
        title: 'TradingView',
        symbol: 'unknown',
        resolution: 'unknown',
        chartType: null,
        apiAvailable: false,
        apiError: 'Cannot read properties of undefined',
      }),
    });
    const result = await healthCheck({ _deps: deps });
    assert.equal(result.success, true);
    assert.equal(result.chart_symbol, 'unknown');
    assert.equal(result.chart_resolution, 'unknown');
    assert.equal(result.chart_type, null);
    assert.equal(result.api_available, false);
  });

  it('returns unknown values when evaluate returns null', async () => {
    const deps = mockDeps({ evaluate: async () => null });
    const result = await healthCheck({ _deps: deps });
    assert.equal(result.success, true);
    assert.equal(result.chart_symbol, 'unknown');
    assert.equal(result.chart_resolution, 'unknown');
    assert.equal(result.chart_type, null);
    assert.equal(result.api_available, false);
  });

  it('throws when CDP connection fails', async () => {
    const deps = mockDeps({
      getClient: async () => { throw new Error('Connection refused'); },
    });
    await assert.rejects(() => healthCheck({ _deps: deps }), /Connection refused/);
  });
});

// ── discover() ────────────────────────────────────────────────────────────────

describe('discover()', () => {
  it('counts available vs total APIs', async () => {
    const deps = mockDeps({
      evaluate: async () => ({
        chartApi: { available: true, path: 'window.TradingViewApi...', methodCount: 42, methods: [] },
        chartWidgetCollection: { available: false, error: 'undefined' },
        chartApiInstance: { available: true, path: 'window.ChartApiInstance', methodCount: 5, methods: [] },
        bottomWidgetBar: { available: false, error: 'undefined' },
        replayApi: { available: true, path: 'window.TradingViewApi._replayApi' },
        alertService: { available: false, error: 'undefined' },
      }),
    });
    const result = await discover({ _deps: deps });
    assert.equal(result.success, true);
    assert.equal(result.apis_total, 6);
    assert.equal(result.apis_available, 3);
    assert.ok(result.apis.chartApi.available);
    assert.ok(!result.apis.chartWidgetCollection.available);
  });

  it('returns zero available when all APIs are unavailable', async () => {
    const apiObj = { available: false, error: 'no access' };
    const deps = mockDeps({
      evaluate: async () => ({
        chartApi: apiObj,
        chartWidgetCollection: apiObj,
        chartApiInstance: apiObj,
        bottomWidgetBar: apiObj,
        replayApi: apiObj,
        alertService: apiObj,
      }),
    });
    const result = await discover({ _deps: deps });
    assert.equal(result.apis_available, 0);
    assert.equal(result.apis_total, 6);
  });
});

// ── uiState() ─────────────────────────────────────────────────────────────────

describe('uiState()', () => {
  it('returns success with spread state', async () => {
    const mockState = {
      bottom_panel: { open: true, height: 200 },
      right_panel: { open: false, width: 0 },
      pine_editor: { open: false, width: 0, height: 0 },
      strategy_tester: { open: false },
      widgetbar: { open: true },
      buttons: { top_bar: [{ label: 'Save', disabled: false, x: 100, y: 10 }] },
      key_buttons: { save: { text: 'Save', disabled: false, visible: true } },
      chart: { symbol: 'ES1!', resolution: '5', chartType: 1, study_count: 3 },
      replay: { available: false, started: false },
    };
    const deps = mockDeps({ evaluate: async () => mockState });
    const result = await uiState({ _deps: deps });
    assert.equal(result.success, true);
    assert.deepEqual(result.bottom_panel, { open: true, height: 200 });
    assert.equal(result.chart.symbol, 'ES1!');
  });

  it('throws when evaluate fails', async () => {
    const deps = mockDeps({
      evaluate: async () => { throw new Error('CDP eval error'); },
    });
    await assert.rejects(() => uiState({ _deps: deps }), /CDP eval error/);
  });
});

// ── launch() ─────────────────────────────────────────────────────────────────

describe('launch()', () => {
  it('throws when TradingView binary is not found', async () => {
    const deps = mockDeps({
      existsSync: () => false,
      execSync: () => { throw new Error('not found'); },
    });
    await assert.rejects(
      () => launch({ _deps: deps }),
      /TradingView not found/,
    );
  });

  it('throws with platform name and searched paths in error message', async () => {
    const deps = mockDeps({
      existsSync: () => false,
      execSync: () => { throw new Error('not found'); },
      platform: 'linux',
    });
    try {
      await launch({ _deps: deps });
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('TradingView not found'));
    }
  });

  it('launches process when binary is found and CDP becomes ready', async () => {
    let spawnCalled = false;
    const mockChild = { pid: 12345, unref: () => {} };

    const deps = mockDeps({
      existsSync: (p) => p.includes('TradingView'),
      spawn: (bin, args, opts) => {
        spawnCalled = true;
        assert.ok(args[0].includes('--remote-debugging-port='));
        assert.equal(opts.detached, true);
        return mockChild;
      },
      httpGet: async () => JSON.stringify({ Browser: 'Electron/28.0', 'User-Agent': 'Mozilla/5.0' }),
    });

    const result = await launch({ port: 9222, kill_existing: false, _deps: deps });
    assert.ok(spawnCalled);
    assert.equal(result.success, true);
    assert.equal(result.pid, 12345);
    assert.equal(result.cdp_port, 9222);
  });

  it('uses default port 9222 when none specified', async () => {
    let capturedArgs = [];
    const mockChild = { pid: 99, unref: () => {} };

    const deps = mockDeps({
      existsSync: (p) => p.includes('TradingView'),
      spawn: (bin, args) => { capturedArgs = args; return mockChild; },
      httpGet: async () => JSON.stringify({ Browser: 'Electron/28.0', 'User-Agent': 'ua' }),
    });

    await launch({ kill_existing: false, _deps: deps });
    assert.ok(capturedArgs.some(a => a.includes('9222')));
  });
});
