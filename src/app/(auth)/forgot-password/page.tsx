import type { Metadata } from 'next';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import { requestPasswordRecovery } from '@/lib/actions/password-recovery';
import RecoverySubmitButton from '@/components/auth/RecoverySubmitButton';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ requested?: string; error?: string }>;
}) {
  const { requested, error } = await searchParams;
  const message = error === 'expired' ? 'El enlace no está disponible. Pedí uno nuevo y abrilo en este mismo navegador.'
    : error === 'email' ? 'Ingresá un correo válido.'
    : error === 'unavailable' ? 'No pudimos iniciar la recuperación. Volvé a intentar.' : null;

  return <section className="mx-auto my-12 max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
    <h1 className="text-2xl font-extrabold">¿Olvidaste tu contraseña?</h1>
    <p className="text-sm text-muted-foreground">Ingresá el correo de tu cuenta para solicitar un enlace de recuperación.</p>
    {message && <p role="alert" className="rounded-xl bg-muted p-3 text-sm">{message}</p>}
    {requested === '1' && <p role="status" className="rounded-xl bg-primary/10 p-3 text-sm">
      Si hay una cuenta asociada a ese correo y el envío está disponible, vas a recibir un enlace. Revisá también spam y abrilo en este mismo navegador.
    </p>}
    <form action={requestPasswordRecovery} className="space-y-4">
      <Input name="email" type="email" label="Correo electrónico" autoComplete="email" maxLength={254} required />
      <RecoverySubmitButton>Solicitar enlace</RecoverySubmitButton>
    </form>
    <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-secondary">Volver a iniciar sesión</Link>
  </section>;
}
