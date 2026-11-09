'use client';
import { useState, useTransition } from 'react';
import { saveCalendarZone } from '@/lib/actions/calendar-zone';

export default function CalendarZoneSetting({ value, signedIn }: { value: string; signedIn: boolean }) {
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return (
    <section id="zona-horaria" aria-labelledby="calendar-zone-heading" className="scroll-mt-24 rounded-(--radius-panel) border border-border bg-card p-5">
      <h3 id="calendar-zone-heading" className="font-bold">Hora del calendario</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Elegí una zona horaria o usá la del dispositivo. La preferencia se guarda {signedIn ? 'en tu cuenta' : 'en este navegador'}.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        action={(data) =>
          start(async () => {
            const result = await saveCalendarZone(String(data.get('zone')));
            setMessage(result.error || 'Zona horaria guardada.');
          })
        }
      >
        <label className="grid min-w-0 gap-1 text-sm font-semibold">
          Zona horaria
          <select
            key={value}
            name="zone"
            defaultValue={value}
            onChange={() => setMessage('')}
            disabled={pending}
            className="min-h-11 max-w-full rounded-(--radius-control) border border-border bg-background px-3"
          >
            <option value="auto">Automática · usar la del dispositivo</option>
            {Array.from(
              new Set([
                'UTC',
                ...Intl.supportedValuesOf('timeZone'),
                ...(value === 'auto' ? [] : [value]),
              ]),
            ).map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </label>
        <button
          disabled={pending}
          type="submit"
          className="min-h-11 rounded-(--radius-control) bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {pending ? 'Guardando…' : 'Guardar zona horaria'}
        </button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-foreground">{message}</p>}
    </section>
  );
}
