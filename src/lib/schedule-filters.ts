export const SCHEDULE_SEASONS = [
  { value: 'winter', label: 'Invierno' }, { value: 'spring', label: 'Primavera' },
  { value: 'summer', label: 'Verano' }, { value: 'fall', label: 'Otoño' },
] as const;
export function currentSchedulePeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: 'numeric' }).formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  return { year, season: SCHEDULE_SEASONS[Math.floor((month - 1) / 3)].value };
}
export function scheduleYears(currentYear: number, favorites?: Array<number | null>) {
  if (favorites) return [...new Set(favorites.filter((year): year is number => Number.isInteger(year) && Number(year) >= 1900 && Number(year) <= currentYear + 1))].sort((a, b) => b - a);
  return Array.from({ length: currentYear + 2 - 1917 }, (_, index) => currentYear + 1 - index);
}
export function resolveSchedulePeriod(yearInput: string | undefined, seasonInput: string | undefined, years: number[], current = currentSchedulePeriod()) {
  const requested = Number(yearInput);
  const year = years.includes(requested) ? requested : years.includes(current.year) ? current.year : years[0] ?? current.year;
  const season = SCHEDULE_SEASONS.find(item => item.value === seasonInput)?.value ?? current.season;
  return { year, season };
}
