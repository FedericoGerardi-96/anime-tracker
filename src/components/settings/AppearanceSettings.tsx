'use client';

import { useState, useSyncExternalStore } from 'react';
import { resolveTheme, type Theme, type ThemePreference } from '@/lib/theme';
import { currentPreference, saveTheme, subscribeTheme } from '@/lib/theme-client';
import styles from './AppearanceSettings.module.css';

const options: { id: Theme; name: string; description: string }[] = [
  { id: 'aurora-nocturna', name: 'Aurora nocturna', description: 'El tema base: tinta oscura con auroras de menta, violeta y sakura.' },
  { id: 'aurora-clara', name: 'Aurora clara', description: 'Fondo lavanda muy claro con las mismas auroras, más suaves. Ideal de día.' },
  { id: 'estreno', name: 'Estreno', description: 'Estilo plataforma de streaming: negro plano, acento naranja brasa, “me encanta” en azul, títulos condensados y esquinas rectas.' },
];

function resolvedSnapshot() {
  return document.documentElement.dataset.theme ?? 'aurora-nocturna';
}

function Poster({ loved = false, small = false }: { loved?: boolean; small?: boolean }) {
  return <div className={`${styles.poster} ${small ? styles.smallPoster : ''}`} aria-hidden="true">
    {!small && <><span className={styles.posterLabel}>Portada</span><span className={`${styles.heart} ${loved ? styles.loved : ''}`}>{loved ? '♥' : '♡'}</span></>}
  </div>;
}

export default function AppearanceSettings({ initialPreference }: { initialPreference: ThemePreference }) {
  const preference = useSyncExternalStore(subscribeTheme, currentPreference, () => initialPreference);
  const theme = useSyncExternalStore(subscribeTheme, resolvedSnapshot, () => resolveTheme(initialPreference));
  const [message, setMessage] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const currentName = options.find((option) => option.id === theme)?.name;
  function choose(next: ThemePreference) {
    const saved = saveTheme(next);
    setSaveFailed(!saved);
    setMessage(saved ? 'Tema guardado en este navegador.' : 'Tema aplicado. No se pudo guardar: revisá si el navegador permite cookies.');
  }

  return <section className={styles.content} aria-labelledby="appearance-heading">
    <div className={styles.intro}>
      <p className={styles.eyebrow}>Apariencia</p>
      <h2 id="appearance-heading">Elegí tu tema</h2>
      <p>Se guarda en este navegador. Cambia colores, superficies y tipografía de títulos; la distribución del sitio es la misma.</p>
    </div>
    <fieldset className={styles.options}>
      <legend className="sr-only">Tema</legend>
      {options.map((option) => <label key={option.id} className={styles.option}>
        <input type="radio" name="appearance-theme" value={option.id} checked={theme === option.id} onChange={() => choose(option.id)} onClick={() => { if (preference === 'auto' && theme === option.id) choose(option.id); }} />
        <span className={styles.thumbnail} data-preview-theme={option.id} aria-hidden="true">
          <span className={styles.miniHeader}><i /><b /></span>
          <span className={styles.miniCards}><i /><i /><i /></span>
          <span className={styles.miniButtons}><i /><i /></span>
        </span>
        <span className={styles.optionText}><span className={styles.radio} aria-hidden="true" /><span><b>{option.name}</b><span>{option.description}</span></span></span>
      </label>)}
    </fieldset>
    <div className={styles.automatic}>
      <div><b id="automatic-label">Automático según el sistema</b><p id="automatic-description">Alterna entre Aurora clara y Aurora nocturna siguiendo la configuración de tu teléfono o computadora.</p></div>
      <button type="button" role="switch" aria-checked={preference === 'auto'} aria-labelledby="automatic-label" aria-describedby="automatic-description" className={styles.switch} onClick={() => choose(preference === 'auto' ? resolveTheme('auto', window.matchMedia('(prefers-color-scheme: dark)').matches) : 'auto')}><i /></button>
    </div>
    <p role="status" className={saveFailed ? styles.saveError : styles.saveStatus}>{message}</p>
    <div className={styles.preview}>
      <div className={styles.previewHeading}><p className={styles.eyebrow}>Vista previa · {preference === 'auto' ? `Automático (${currentName})` : currentName}</p><span>Así se ven las piezas principales</span></div>
      <div className={styles.previewPanel}>
        <div className={styles.watching}>
          <Poster small />
          <div className={styles.watchingInfo}><span>EP 9 salió hoy a las 11:00</span><h3>Dandadan 2nd Season</h3><div className={styles.progressRow}><div className={styles.progress}><i /></div><span>8 / 12</span></div></div>
          <span className={`${styles.button} ${styles.primary}`}><span aria-hidden="true">▷</span> Vi el EP 9</span>
        </div>
        <div className={styles.cards}>
          {[
            { title: 'Frieren', state: 'Completado', token: 'completado', loved: true },
            { title: 'The Apothecary Diaries', state: 'Viendo', token: 'viendo' },
            { title: 'Bocchi the Rock!', state: 'Pendiente', token: 'pendiente' },
            { title: 'Chainsaw Man', state: 'En pausa', token: 'pausa' },
          ].map((anime) => <div className={styles.animeCard} key={anime.title}>
            <Poster loved={anime.loved} /><b>{anime.title}</b>
            <div className={styles.cardStates}><span className={styles.status} data-status={anime.token}><i />{anime.state}</span>{anime.token === 'viendo' && <span className={styles.episode}>EP <b>17</b>/24 <span>+1</span></span>}</div>
          </div>)}
        </div>
        <div className={styles.samples}><span className={`${styles.button} ${styles.primary}`}>Agregar a mi biblioteca</span><span className={`${styles.button} ${styles.secondary}`}>Guardar en lista</span><span className={`${styles.button} ${styles.love}`}>Me encanta</span><span className={`${styles.tag} ${styles.activeTag}`}>Fantasía</span><span className={styles.tag}>Drama</span><span className={styles.tag}>Comedia</span></div>
      </div>
    </div>
  </section>;
}
