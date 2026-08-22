import BriefView from '@/components/BriefView';
import { getLatestBrief } from '@/lib/data';

export default function HomePage() {
  const brief = getLatestBrief();
  if (!brief) {
    return (
      <div>
        <h1 className="headline">No briefings yet</h1>
        <p className="overview">The first daily brief will appear here after the pipeline&apos;s first run.</p>
      </div>
    );
  }
  return (
    <>
      <BriefView brief={brief} />
      <div className="footer-note">
        Fuels Errand is a daily briefing on refined fuels markets — gasoline, diesel, renewable diesel, and SAF.
        Every item links to its original source; social media and forums are never used as source material.
      </div>
    </>
  );
}
