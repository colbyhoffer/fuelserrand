import BriefView from '@/components/BriefView';
import { getBrief, getBriefDates } from '@/lib/data';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  const dates = getBriefDates();
  // Static export requires at least one param set; the placeholder page 404s gracefully.
  return dates.length ? dates.map((date) => ({ date })) : [{ date: 'none' }];
}

export default async function BriefPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const brief = getBrief(date);
  if (!brief) notFound();
  return <BriefView brief={brief} />;
}
