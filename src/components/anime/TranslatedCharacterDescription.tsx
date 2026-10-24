'use client';

import CharacterDescription from '@/components/anime/CharacterDescription';
import Loader from '@/components/ui/Loader';
import { useBrowserTranslation } from '@/hooks/useBrowserTranslation';
import { normalizeTranslatableText } from '@/lib/plain-text';

export default function TranslatedCharacterDescription({ original, emptyMessage }: Readonly<{ anilistId: number; original?: string | null; canSave: boolean; emptyMessage?: string }>) {
  const source = normalizeTranslatableText(original ?? '');
  const { text, status } = useBrowserTranslation({ original: source, label: 'biografía' });
  if (!source) return <CharacterDescription value={null} emptyMessage={emptyMessage} />;
  if (text === null) return <Loader label={status || 'Preparando la biografía…'} className='min-h-24 justify-start' />;
  return <CharacterDescription value={text} emptyMessage={emptyMessage} />;
}
