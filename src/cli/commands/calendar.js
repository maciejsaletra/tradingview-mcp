import { register } from '../router.js';
import { fetchCalendar } from '../../core/calendar.js';

register('calendar', {
  description: 'ForexFactory economic calendar — fetch events for today or a specific date',
  subcommands: new Map([
    ['today', {
      description: 'Show economic events for today (default: High impact only)',
      options: {
        impact: { type: 'string', description: 'Minimum impact level: High | Medium | Low (default: High)' },
        currencies: { type: 'string', description: 'Comma-separated currency filter, e.g. USD,EUR,GBP' },
        date: { type: 'string', description: 'Date override in YYYY-MM-DD format (default: today)' },
      },
      handler: async (opts) => {
        const currencies = opts.currencies
          ? opts.currencies.split(',').map(c => c.trim())
          : [];
        const events = await fetchCalendar({
          date: opts.date || null,
          impact: opts.impact || 'High',
          currencies: currencies.length ? currencies : undefined,
        });
        return { success: true, count: events.length, events };
      },
    }],
  ]),
});
