'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './AnimeDetailView.module.css';

export default function AnimeBanner({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.banner} aria-hidden="true">
    <span className={styles.native}>{title}</span>
    {src && !failed && <Image src={src} alt="" fill sizes="100vw" className={styles.bannerImage} onError={() => setFailed(true)} onLoad={event => {
      const image = event.currentTarget;
      if (image.naturalWidth / image.naturalHeight < 1.4) setFailed(true);
    }} />}
    <div className={styles.texture} />
  </div>;
}
