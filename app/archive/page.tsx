import Link from 'next/link';
import { getBriefDates, getBrief, formatDateLong } from '@/lib/data';

export const metadata = { title: 'Archive · Fuels Errand' };

export default function ArchivePage() {
  const dates = getBriefDates();
  return (
    <div>
      <h1 className="headline">Briefing Archive</h1>
      {dates.length === 0 && <p className="overview">No briefings yet.</p>}
      <ul className="archive-list">
        {dates.map((date) => {
          const brief = getBrief(date);
          return (
            <li key={date}>
              <span className="archive-date">{date}</span>
              <Link href={`/brief/${date}/`}>{brief?.headline ?? formatDateLong(date)}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
