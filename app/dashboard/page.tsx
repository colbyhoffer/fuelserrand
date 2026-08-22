import LineChart from '@/components/LineChart';
import { getPriceHistory } from '@/lib/data';

export const metadata = { title: 'Dashboard · Fuels Errand' };

const EIA_SPOT = 'https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm';
const EIA_RETAIL = 'https://www.eia.gov/petroleum/gasdiesel/';
const EIA_WPSR = 'https://www.eia.gov/petroleum/supply/weekly/';

export default function DashboardPage() {
  const history = getPriceHistory();
  const pick = (key: 'rbobSpot' | 'ulsdSpot' | 'wtiSpot' | 'gasCrack' | 'dieselCrack' | 'retailGas' | 'retailDiesel' | 'gasStocksMbbl' | 'distStocksMbbl') =>
    history.filter((p) => p[key] != null).map((p) => ({ date: p.date, value: p[key] as number }));

  return (
    <div>
      <h1 className="headline">Market Dashboard</h1>
      <p className="overview">Daily spot prices and crack spreads, weekly retail prices and inventories. All data from the U.S. Energy Information Administration.</p>

      <LineChart
        title="Spot Prices — NY Harbor"
        unit="$/gal"
        sourceUrl={EIA_SPOT}
        sourceLabel="EIA spot prices"
        series={[
          { label: 'RBOB Gasoline', color: 'var(--accent)', points: pick('rbobSpot') },
          { label: 'ULSD Diesel', color: 'var(--accent-2)', points: pick('ulsdSpot') },
        ]}
      />
      <LineChart
        title="Crack Spreads vs WTI"
        unit="$/bbl"
        sourceUrl={EIA_SPOT}
        sourceLabel="EIA spot prices"
        series={[
          { label: 'Gasoline crack', color: 'var(--accent)', points: pick('gasCrack') },
          { label: 'Diesel crack', color: 'var(--accent-2)', points: pick('dieselCrack') },
        ]}
      />
      <LineChart
        title="US Retail Prices (weekly)"
        unit="$/gal"
        sourceUrl={EIA_RETAIL}
        sourceLabel="EIA retail prices"
        series={[
          { label: 'Gasoline (all grades)', color: 'var(--accent)', points: pick('retailGas') },
          { label: 'On-highway diesel', color: 'var(--accent-2)', points: pick('retailDiesel') },
        ]}
      />
      <LineChart
        title="US Product Inventories (weekly)"
        unit="thousand barrels"
        sourceUrl={EIA_WPSR}
        sourceLabel="EIA Weekly Petroleum Status Report"
        series={[
          { label: 'Total motor gasoline', color: 'var(--accent)', points: pick('gasStocksMbbl') },
          { label: 'Distillate', color: 'var(--accent-2)', points: pick('distStocksMbbl') },
        ]}
      />
    </div>
  );
}
