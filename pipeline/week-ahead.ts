import type { WeekAheadItem } from './types';

// Friday footer: fixed-schedule items for the coming week. Earnings dates vary;
// the IR watcher will catch the documents when they land.
export function buildWeekAhead(now: Date): WeekAheadItem[] {
  const items: WeekAheadItem[] = [];
  const day = (offset: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  };
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });

  // From Friday: next Wed = +5, next Thu = +6, next Tue = +4.
  items.push({ date: fmt(day(5)), label: 'EIA Weekly Petroleum Status Report (10:30am ET) — inventories, demand, refinery runs' });
  items.push({ date: fmt(day(5)), label: 'EIA This Week in Petroleum analysis' });
  items.push({ date: fmt(day(4)), label: 'EPA weekly RIN transaction data update' });
  items.push({ date: fmt(day(3)), label: 'EIA weekly retail gasoline & diesel prices (Mon PM)' });
  return items;
}
