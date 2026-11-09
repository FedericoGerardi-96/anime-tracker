import { Skeleton } from '@/components/fallbacks/PageSkeleton';
import styles from '@/components/profile/ProfileView.module.css';

export default function ProfileSkeleton() {
  return (
    <div className={styles.profile} role="status" aria-label="Cargando perfil…">
      <div className={styles.banner} aria-hidden="true" />
      <div className={styles.wrap}>
        <div className={styles.header}>
          <Skeleton className="size-[132px] shrink-0 rounded-full!" />
          <div className={styles.identity}>
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className={styles.columns}>
          <div className={styles.content}>
            <Skeleton className="h-16" />
            <div className={styles.posters}>
              {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="aspect-2/3" />)}
            </div>
          </div>
          <div className={styles.sidebar}><Skeleton className="h-64" /></div>
        </div>
      </div>
    </div>
  );
}
