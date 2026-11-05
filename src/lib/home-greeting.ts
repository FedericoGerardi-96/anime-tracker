export function homeDisplayName(...candidates: unknown[]): string | null {
  const name = candidates.find((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return name?.trim().split(/\s+/)[0] ?? null;
}

export function homeLocalDate(now: number): { label: string; dateTime: string } {
  const date = new Date(now);
  const label = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return { label, dateTime: `${year}-${month}-${day}` };
}
