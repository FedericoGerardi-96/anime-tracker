"use client";
import Loader from "@/components/ui/Loader";
import { useBrowserTranslation } from '@/hooks/useBrowserTranslation';
import { normalizeTranslatableText } from '@/lib/plain-text';
interface Props { malId: number; mediaType: "anime" | "manga"; original: string; canSave?: boolean; className?: string; loaderClassName?: string }

export default function TranslatedSynopsis({ original, className = "mb-6 text-lg leading-relaxed text-foreground/80 dark:text-slate-300", loaderClassName = "min-h-32 justify-start" }: Readonly<Props>) {
  const cleanOriginal = normalizeTranslatableText(original);
  const { text, status } = useBrowserTranslation({ original: cleanOriginal, label: 'sinopsis' });

  if (text === null) return <Loader label={status || "Preparando la sinopsis…"} className={loaderClassName} />;
  return <p className={className}>{text}</p>;
}
