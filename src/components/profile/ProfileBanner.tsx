import { profileAvatarBackground } from '@/lib/profile-avatar';
import styles from './ProfileView.module.css';

export default function ProfileBanner({ src, className = '' }: Readonly<{ src?: string | null; className?: string }>) {
  return (
    <div className={`${styles.banner} ${className}`} aria-hidden="true">
      {src && <div className={styles.bannerImage} style={{ backgroundImage: profileAvatarBackground(src) }} />}
    </div>
  );
}
