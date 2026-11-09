import type { ReactNode } from 'react';
import Link from 'next/link';
import { Unbounded, JetBrains_Mono } from 'next/font/google';
import { CONNECTED_ACCOUNTS_PATH } from '@/lib/oauth-return-path';
import styles from './AppearanceSettings.module.css';

const display = Unbounded({ subsets: ['latin'], weight: ['600'], variable: '--settings-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--settings-mono' });

const sections = {
  profile: { href: '/settings/profile', label: 'Perfil y biografía' },
  appearance: { href: '/settings/appearance', label: 'Apariencia' },
  preferences: { href: '/settings/preferences', label: 'Preferencias' },
  privacy: { href: '/settings/privacy', label: 'Privacidad' },
  accounts: { href: CONNECTED_ACCOUNTS_PATH, label: 'Cuentas conectadas' },
  adult: { href: '/settings/adult-content', label: 'Contenido adulto' },
};

type Section = keyof typeof sections;

export function SettingsFrame({ active, children }: { active: Section; children: ReactNode }) {
  return (
    <div className={`${styles.layout} ${display.variable} ${mono.variable}`}>
      <aside className={styles.sidebar}>
        <h1>Ajustes</h1>
        <nav aria-label="Secciones de ajustes">
          {Object.entries(sections).map(([key, { href, label }]) => (
            <Link key={key} href={href} aria-current={key === active ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
      </aside>
      {children}
    </div>
  );
}

export function SettingsSection({ active, description, children }: {
  active: Exclude<Section, 'appearance'>;
  description: string;
  children: ReactNode;
}) {
  return (
    <SettingsFrame active={active}>
      <section className={styles.content} aria-labelledby="settings-heading">
        <header className={styles.intro}>
          <h2 id="settings-heading">{sections[active].label}</h2>
          <p>{description}</p>
        </header>
        {children}
      </section>
    </SettingsFrame>
  );
}
