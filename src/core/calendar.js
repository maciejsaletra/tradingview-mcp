const FF_URL_THIS = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const FF_URL_NEXT = 'https://nfs.faireconomy.media/ff_calendar_nextweek.json';

const IMPACT_ORDER = { High: 3, Medium: 2, Low: 1, Holiday: 0 };

export async function fetchCalendar({ date, impact, currencies } = {}) {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Fetch this week; if target date is in next week fetch that too
  const sources = [FF_URL_THIS];
  const dayOfWeek = targetDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) sources.push(FF_URL_NEXT);

  const results = await Promise.all(
    sources.map(url => fetch(url).then(r => r.json()).catch(() => []))
  );
  let events = results.flat();

  // Filter by date
  events = events.filter(e => {
    const d = new Date(e.date);
    return d >= targetDate && d < nextDay;
  });

  // Filter by impact
  if (impact) {
    const minLevel = IMPACT_ORDER[impact] ?? 0;
    events = events.filter(e => (IMPACT_ORDER[e.impact] ?? 0) >= minLevel);
  }

  // Filter by currencies
  if (currencies && currencies.length > 0) {
    const set = new Set(currencies.map(c => c.toUpperCase()));
    events = events.filter(e => set.has(e.country));
  }

  // Sort by time
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  return events.map(e => ({
    time: new Date(e.date).toISOString(),
    timeLocal: new Date(e.date).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }),
    currency: e.country,
    impact: e.impact,
    title: e.title,
    forecast: e.forecast || '—',
    previous: e.previous || '—',
    actual: e.actual || '—',
  }));
}
