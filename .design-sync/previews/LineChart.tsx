import { LineChart } from 'fuelserrand';

const crackPoints = (vals: number[]) =>
  vals.map((value, i) => ({ date: `2026-0${Math.floor(i / 4) + 3}-${String((i % 4) * 7 + 1).padStart(2, '0')}`, value }));

export const CrackSpreads = () => (
  <LineChart
    title="Crack Spreads vs WTI"
    unit="$/bbl"
    sourceUrl="https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm"
    sourceLabel="EIA spot prices"
    series={[
      { label: 'Gasoline crack', color: 'var(--accent)', points: crackPoints([31.2, 33.8, 30.4, 35.1, 38.9, 41.2, 39.7, 43.5, 44.1, 46.8, 45.9, 47.2, 46.4, 47.1, 47.5, 48.5]) },
      { label: 'Diesel crack', color: 'var(--chart-2)', points: crackPoints([42.6, 44.1, 47.9, 52.3, 58.7, 61.4, 66.2, 71.8, 75.3, 80.1, 84.6, 88.9, 90.2, 92.9, 94.8, 96.72]) },
    ]}
  />
);

export const SpotPrices = () => (
  <LineChart
    title="Spot Prices — NY Harbor"
    unit="$/gal"
    sourceUrl="https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm"
    sourceLabel="EIA spot prices"
    series={[
      { label: 'Gasoline (conventional)', color: 'var(--accent)', points: crackPoints([2.61, 2.68, 2.64, 2.72, 2.79, 2.85, 2.83, 2.91, 2.96, 3.02, 3.05, 3.09, 3.08, 3.10, 3.12, 3.156]) },
      { label: 'ULSD Diesel', color: 'var(--chart-2)', points: crackPoints([3.12, 3.18, 3.29, 3.41, 3.55, 3.62, 3.74, 3.86, 3.95, 4.05, 4.12, 4.18, 4.21, 4.25, 4.28, 4.304]) },
    ]}
  />
);

export const EmptyState = () => (
  <LineChart
    title="US Product Inventories (weekly)"
    unit="thousand barrels"
    sourceUrl="https://www.eia.gov/petroleum/supply/weekly/"
    sourceLabel="EIA Weekly Petroleum Status Report"
    series={[
      { label: 'Total motor gasoline', color: 'var(--accent)', points: [] },
      { label: 'Distillate', color: 'var(--chart-2)', points: [] },
    ]}
  />
);
