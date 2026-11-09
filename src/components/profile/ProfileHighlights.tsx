import Link from 'next/link';
import { slugify } from '@/lib/utils';
import type { ProfileHighlight, ProfileHighlightCategory } from '@/types/profile-highlights';
import ProfileCover from './ProfileCover';
import styles from './ProfileView.module.css';

const categories = [
  { key: 'anime', label: 'Anime' },
  { key: 'manga', label: 'Manga' },
  { key: 'character', label: 'Personajes' },
] as const;

export default function ProfileHighlights({ items, own, visible }: Readonly<{
  items: ProfileHighlight[] | null;
  own: boolean;
  visible: ProfileHighlightCategory[];
}>) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Destacados</p>
          <h2 className={styles.heading}>Mi top</h2>
        </div>
        {own && <Link className={styles.textLink} href="/profile/highlights">Editar mi top</Link>}
      </div>
      {visible.length === 0 ? (
        <p className={styles.muted}>Este top es privado.</p>
      ) : items === null ? (
        <p className={styles.muted}>No pudimos cargar el top.</p>
      ) : items.length === 0 ? (
        <p className={styles.muted}>{own ? 'Elegí y ordená tus anime, manga y personajes.' : 'Todavía no hay destacados para mostrar.'}</p>
      ) : categories.filter(({ key }) => visible.includes(key)).map(({ key, label }) => {
        const group = items.filter(item => item.category === key).sort((a, b) => a.position - b.position).slice(0, 10);
        if (!group.length) return null;
        return (
          <div key={key} className={styles.topGroup}>
            <h3 className={styles.category}>{label}</h3>
            <ol className={styles.posters}>
              {group.map(item => {
                const canonicalIds = item.anilist_id || item.mal_id ? `${item.anilist_id ?? 0}-${item.mal_id ?? 0}` : null;
                const characterId = canonicalIds ?? (item.provider === 'myanimelist' ? `mal-${item.external_id}` : item.external_id);
                const href = key === 'character' ? `/characters/${characterId}-${slugify(item.title)}` : `/${key}/${item.external_id}-${slugify(item.title)}`;
                return (
                  <li key={item.id ?? item.external_id}>
                    <Link href={href} className={styles.poster}>
                      <ProfileCover src={item.image_url} sizes="(max-width: 640px) 45vw, (max-width: 950px) 25vw, 175px" />
                      <span className={styles.rank}>{item.position + 1}</span>
                      <span className={styles.posterTitle}>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </section>
  );
}
