'use client';

import { useEffect, useState } from 'react';
import { normalizeTranslatableText } from '@/lib/plain-text';
import type { BrowserTranslationOptions, BrowserTranslationState, TranslatorApi, TranslatorInstance } from '@/interfaces/browser-translation';

export function useBrowserTranslation({ original, label }: BrowserTranslationOptions) {
  const source = normalizeTranslatableText(original);
  const [state, setState] = useState<BrowserTranslationState>({ source, text: source ? null : '', status: null });
  if (state.source !== source) setState({ source, text: source ? null : '', status: null });

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    let translator: TranslatorInstance | undefined;
    const release = () => {
      const instance = translator;
      translator = undefined;
      instance?.destroy();
    };
    const updateStatus = (status: string) => {
      if (!cancelled) setState({ source, text: null, status });
    };
    async function run() {
      try {
        if (!('Translator' in globalThis)) throw new Error('Translator no disponible');
        const api = (globalThis as typeof globalThis & { Translator: TranslatorApi }).Translator;
        const availability = await api.availability({ sourceLanguage: 'en', targetLanguage: 'es' });
        if (cancelled) return;
        if (availability === 'unavailable') throw new Error('Par de idiomas no disponible');
        if (availability !== 'available') updateStatus('Preparando el traductor de Chrome…');
        translator = await api.create({ sourceLanguage: 'en', targetLanguage: 'es', monitor(monitor) {
          monitor.addEventListener('downloadprogress', event => updateStatus(`Descargando traductor: ${Math.round(event.loaded * 100)} %`));
        }});
        if (cancelled) return;
        updateStatus(`Traduciendo ${label}…`);
        const translated = normalizeTranslatableText(await translator.translate(source));
        if (!cancelled) setState({ source, text: translated || source, status: null });
      } catch {
        if (!cancelled) setState({ source, text: source, status: null });
      } finally {
        // Also releases an instance whose creation finished after unmounting.
        release();
      }
    }
    void run();
    return () => { cancelled = true; release(); };
  }, [label, source]);

  return { text: state.text, status: state.status };
}
