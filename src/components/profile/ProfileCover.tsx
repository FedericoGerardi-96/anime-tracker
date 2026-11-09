import Image from 'next/image';

const coverHosts = new Set(['s4.anilist.co', 'cdn.myanimelist.net', 'api-cdn.myanimelist.net', 'myanimelist.net', 'res.cloudinary.com']);

export default function ProfileCover({ src, sizes = '40px' }: Readonly<{ src?: string | null; sizes?: string }>) {
  if (!src) return null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !coverHosts.has(url.hostname)) return null;
  return <Image src={url.href} alt="" fill sizes={sizes} className="object-cover" />;
}
