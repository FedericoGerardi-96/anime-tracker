import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readReleaseDetail } from '@/services/calendar-release-detail';

export default async function ReleasePage({ params }: { params: Promise<{ clave: string }> }) {
  const { clave } = await params;
  const match = /^(ani|maze)-([1-9]\d{0,9})$/.exec(clave);
  if (!match) notFound();
  let detail;
  try {
    detail = await readReleaseDetail(match[1], Number(match[2]));
  } catch {
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-2xl font-bold">No pudimos cargar la ficha de la emisión</h1>
        <Link href="/anime/schedule" className="text-primary underline">
          Volver al calendario
        </Link>
      </section>
    );
  }
  if (!detail) notFound();
  return (
    <section className="space-y-6 py-8">
      <Link href="/anime/schedule" className="text-sm text-primary hover:underline">
        Volver al calendario
      </Link>
      <div className="flex flex-wrap gap-6 rounded-2xl border bg-card p-5 sm:p-8">
        {detail.cover && (
          <Image alt="" src={detail.cover} width={160} height={228} className="h-fit rounded-xl" />
        )}
        <div className="min-w-0 flex-1 basis-72 space-y-4">
          <p className="text-sm text-muted-foreground">
            Emisión{detail.episode ? ' · Episodio ' + detail.episode : ''}
          </p>
          <h1 className="text-3xl font-bold">{detail.title}</h1>
          {detail.summary && <p className="max-w-prose text-muted-foreground">{detail.summary}</p>}
          <nav aria-label="Más información" className="flex flex-wrap gap-4">
            {detail.links.map((link) => (
              <a key={link.label} className="text-primary hover:underline" href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
