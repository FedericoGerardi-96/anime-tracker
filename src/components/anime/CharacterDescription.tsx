import type { ReactNode } from "react";

const INLINE_MARKDOWN = /(\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
const MARKDOWN_LINK = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/;

function renderInline(line: string): ReactNode[] {
  return line.split(INLINE_MARKDOWN).filter(Boolean).map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={`${index}-${part}`} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    }
    const link = part.match(MARKDOWN_LINK);
    if (link) {
      return <a key={`${index}-${part}`} href={link[2]} target="_blank" rel="noreferrer" className="font-medium text-primary underline decoration-primary/35 underline-offset-2 hover:decoration-primary">{link[1]}</a>;
    }
    return part;
  });
}

export default function CharacterDescription({ value, emptyMessage = "Todavía no hay una descripción disponible." }: Readonly<{ value?: string | null; emptyMessage?: string }>) {
  if (!value?.trim()) return <p className="text-muted-foreground">{emptyMessage}</p>;

  return <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
    {value.trim().split(/\n{2,}/).map((paragraph, paragraphIndex) => (
      <p key={`${paragraphIndex}-${paragraph.slice(0, 24)}`}>
        {paragraph.split("\n").map((line, lineIndex) => (
          <span key={`${lineIndex}-${line.slice(0, 24)}`}>
            {renderInline(line)}
            {lineIndex < paragraph.split("\n").length - 1 && <br />}
          </span>
        ))}
      </p>
    ))}
  </div>;
}
