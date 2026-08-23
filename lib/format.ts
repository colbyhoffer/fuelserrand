// Pure formatting helpers — no filesystem or server dependencies, safe to
// bundle for the browser (the design-system export relies on this).

export function formatDateLong(date: string): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}
