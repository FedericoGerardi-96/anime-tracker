import { ImageResponse } from 'next/og';
import { getSharedList } from '@/services/list-sharing';

const noStore = { 'Cache-Control': 'private, no-store' };

async function loadCover(url: string | null | undefined) {
  if (!url) return null;
  try {
    // getSharedList only returns HTTPS URLs from the configured cover providers.
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(3500) });
    const type = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || (type !== 'image/jpeg' && type !== 'image/png')) return null;
    const data = await response.arrayBuffer();
    if (data.byteLength > 4 * 1024 * 1024) return null;
    return `data:${type};base64,${Buffer.from(data).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ shareSlug: string }> }) {
  const { shareSlug } = await params;
  const list = await getSharedList(shareSlug, 0, 12);
  if (!list) return new Response(null, { status: 404, headers: noStore });
  const sources = list.items.flatMap(item => item.image ? [item.image] : []).slice(0, 3);
  const covers = await Promise.all(sources.map(loadCover));
  return new ImageResponse(
    <div style={{
      display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 12% 0%, #43346e 0%, transparent 65%), radial-gradient(ellipse at 100% 0%, #1b5047 0%, transparent 60%), #0b0a15',
    }}>
      {[0, 1, 2].map(index => <div key={index} style={{
        display: 'flex', position: 'absolute', left: 204 + index * 269, top: index === 1 ? 72 : 101,
        width: 254, height: 398, overflow: 'hidden', borderRadius: 26, border: '2px solid #5b5477',
        background: 'linear-gradient(135deg, #242039, #121120)',
        transform: `rotate(${[-7, 0, 7][index]}deg)`,
      }}>
        {covers[index] && (
          // ImageResponse renders its own image elements, independent of the Next.js image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={covers[index]} alt="" width={254} height={398} style={{ objectFit: 'cover' }} />
        )}
      </div>)}
    </div>,
    { width: 1200, height: 630, headers: noStore },
  );
}
