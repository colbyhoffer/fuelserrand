import { getEarningsCalendar } from '@/lib/data';

export const metadata = { title: 'Earnings Calendar · Fuels Errand' };

const GROUP_LABELS: Record<string, string> = {
  refiner: 'Refiners',
  renewables: 'Renewable Diesel / SAF',
  retail: 'Fuel Retail / C-Store',
  bigbox: 'Big Box Fuel',
};

export default function EarningsPage() {
  const cal = getEarningsCalendar();
  return (
    <div>
      <h1 className="headline">Earnings Calendar</h1>
      <p className="overview">
        Estimated next report date for each watched company, projected from its historical SEC filing cadence
        (earnings 8-Ks, item 2.02). Companies confirm exact dates by press release — the daily brief picks those up.
        Refreshed every weekday.
      </p>
      {cal.length === 0 && <p className="overview" style={{ marginTop: 24 }}>Calendar builds on the next pipeline run.</p>}
      {cal.length > 0 && (
        <table className="earnings-table">
          <thead>
            <tr><th>Est. next report</th><th>Company</th><th>Group</th><th>Last reported</th></tr>
          </thead>
          <tbody>
            {cal.map((e) => (
              <tr key={e.ticker}>
                <td className="earnings-date">{e.nextEstimate}</td>
                <td>{e.name} <span className="deck-ticker">({e.ticker})</span></td>
                <td>{GROUP_LABELS[e.group] ?? e.group}</td>
                <td className="earnings-past">{e.lastReport}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
