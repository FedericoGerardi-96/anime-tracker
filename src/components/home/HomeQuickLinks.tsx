import Link from "next/link";

const QUICK_LINKS = [
  {
    href: "/anime/schedule",
    icon: "calendar_month",
    title: "Calendario",
    description: "Consultá todos los estrenos de la semana",
  },
  {
    href: "/favorites",
    icon: "favorite",
    title: "Favoritos",
    description: "Volvé rápido a los títulos que guardaste",
  },
  {
    href: "/lists",
    icon: "checklist",
    title: "Mis listas",
    description: "Organizá lo que ves y lo que querés empezar",
  },
];

export default function HomeQuickLinks() {
  return (
    <section className="rounded-2xl border border-border bg-card p-2">
      {QUICK_LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group flex items-center gap-3 rounded-xl p-3 transition hover:bg-muted"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
            <span className="material-symbols-outlined text-xl">
              {item.icon}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {item.title}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {item.description}
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}
