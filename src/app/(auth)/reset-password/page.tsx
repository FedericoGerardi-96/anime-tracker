import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Input from '@/components/ui/Input';
import { updateRecoveredPassword } from '@/lib/actions/password-recovery';
import { getRecoveryClient } from '@/lib/password-recovery';
import RecoverySubmitButton from '@/components/auth/RecoverySubmitButton';

export const metadata: Metadata = { title: 'Nueva contraseña' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getRecoveryClient())) redirect('/forgot-password?error=expired');
  const { error } = await searchParams;
  const message = error === 'match' ? 'Las contraseñas tienen que coincidir.'
    : error === 'password' ? 'Elegí una contraseña nueva de entre 8 y 128 caracteres que cumpla las reglas de seguridad.'
    : error === 'save' ? 'No pudimos guardar la contraseña. Volvé a intentar.' : null;

  return <section className="mx-auto my-12 max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
    <h1 className="text-2xl font-extrabold">Elegí una nueva contraseña</h1>
    <p className="text-sm text-muted-foreground">Usá al menos 8 caracteres.</p>
    {message && <p role="alert" className="rounded-xl bg-muted p-3 text-sm">{message}</p>}
    <form action={updateRecoveredPassword} className="space-y-4">
      <Input name="password" type="password" label="Nueva contraseña" autoComplete="new-password" minLength={8} maxLength={128} required />
      <Input name="confirmation" type="password" label="Repetí la contraseña" autoComplete="new-password" minLength={8} maxLength={128} required />
      <RecoverySubmitButton>Guardar contraseña</RecoverySubmitButton>
    </form>
  </section>;
}
