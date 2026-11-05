'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveCalendarZone } from '@/lib/actions/calendar-zone';

export default function CalendarZoneSetting({ value }: { value: string }) {
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <section id="zona-horaria" className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-bold">Hora del calendario</h3>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        action={(data) =>
          start(async () => {
            const result = await saveCalendarZone(String(data.get('zone')));
            setMessage(result.error || 'Zona horaria guardada.');
            if (!result.error) router.refresh();
          })
        }
      >
        <label className="grid gap-1 text-sm">
          Zona horaria
          <select
            name="zone"
            defaultValue={value}
            className="max-w-full rounded-lg border bg-background px-3 py-2"
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
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
        >
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
}
