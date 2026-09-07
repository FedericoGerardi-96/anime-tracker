"use client";
import Loader from "@/components/ui/Loader";
import { useMemo } from 'react';
import { useBrowserTranslation } from '@/hooks/useBrowserTranslation';
import { normalizeTranslatableText } from '@/lib/plain-text';
interface Props { malId: number; mediaType: "anime" | "manga"; original: string; canSave: boolean; className?: string; loaderClassName?: string }

export default function TranslatedSynopsis({ malId, mediaType, original, canSave, className = "mb-6 text-lg leading-relaxed text-slate-300", loaderClassName = "min-h-32 justify-start" }: Readonly<Props>) {
  const postData = useMemo(() => ({ malId, mediaType }), [malId, mediaType]);
  const cleanOriginal = normalizeTranslatableText(original);
  const { text, status } = useBrowserTranslation({ original: cleanOriginal, getUrl: `/api/translations/synopsis?malId=${malId}&mediaType=${mediaType}`, postUrl: '/api/translations/synopsis', postData, canSave, label: 'sinopsis' });

  if (!text) return <Loader label={status || "Preparando la sinopsis…"} className={loaderClassName} />;
  return <p className={className}>{text}</p>;
}
