'use client';

import { useEffect, useState } from 'react';
import { normalizeTranslatableText } from '@/lib/plain-text';

interface TranslatorInstance { translate(text: string): Promise<string>; destroy(): void }
interface TranslatorApi {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  create(options: { sourceLanguage: string; targetLanguage: string; monitor?: (monitor: { addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void }) => void }): Promise<TranslatorInstance>;
}

async function hashText(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.trim()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function useBrowserTranslation({ original, getUrl, postUrl, postData, canSave, label }: { original: string; getUrl: string; postUrl: string; postData: Record<string, unknown>; canSave: boolean; label: string }) {
  const [text, setText] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let translator: TranslatorInstance | undefined;
    async function run() {
      try {
        if (!('Translator' in globalThis)) throw new Error('Translator no disponible');
        const api = (globalThis as typeof globalThis & { Translator: TranslatorApi }).Translator;
        const availability = await api.availability({ sourceLanguage: 'en', targetLanguage: 'es' });
        if (availability === 'unavailable' || cancelled) throw new Error('Par de idiomas no disponible');
        if (availability !== 'available') setStatus('Preparando el traductor de Chrome…');
        translator = await api.create({ sourceLanguage: 'en', targetLanguage: 'es', monitor(monitor) {
          monitor.addEventListener('downloadprogress', (event) => { if (!cancelled) setStatus(`Descargando traductor: ${Math.round(event.loaded * 100)} %`); });
        }});
        if (cancelled) return;
        setStatus(`Traduciendo ${label}…`);
        const translated = normalizeTranslatableText(await translator.translate(normalizeTranslatableText(original)));
        if (!translated || cancelled) return;
        setText(translated); setStatus(null);
        if (canSave) await fetch(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...postData, sourceHash: await hashText(original), translatedText: translated }) });
      } catch {
        if (cancelled) return;
        setStatus('Buscando una traducción guardada…');
        try {
          const response = await fetch(getUrl, { cache: 'no-store' });
          const payload = response.ok ? await response.json() as { text?: string | null; description?: string | null } : null;
          setText(normalizeTranslatableText(payload?.text || payload?.description || original));
        } catch { setText(normalizeTranslatableText(original)); }
        setStatus(null);
      }
    }
    void run();
    return () => { cancelled = true; translator?.destroy(); };
  }, [canSave, getUrl, label, original, postData, postUrl]);

  return { text, status };
}
