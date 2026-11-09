'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearRecoverySession, getRecoveryClient } from '@/lib/password-recovery';
import { createClient } from '@/lib/supabase/server';

export async function requestPasswordRecovery(formData: FormData) {
  const value = formData.get('email');
  const email = typeof value === 'string' ? value.trim() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/forgot-password?error=email');

  const origin = (await headers()).get('origin');
  if (!origin || !URL.canParse(origin)) redirect('/forgot-password?error=unavailable');
  const callback = new URL('/auth/recovery', origin);
  if (!['http:', 'https:'].includes(callback.protocol)) redirect('/forgot-password?error=unavailable');

  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.href });
    if (error) console.warn('Password recovery request rejected', error.code ?? error.status ?? 'unknown');
  } catch {
    console.warn('Password recovery request failed');
  }
  // Keep the response the same for registered, unknown and rejected addresses.
  redirect('/forgot-password?requested=1');
}

export async function updateRecoveredPassword(formData: FormData) {
  const supabase = await getRecoveryClient();
  if (!supabase) redirect('/forgot-password?error=expired');
  const password = formData.get('password');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) redirect('/reset-password?error=password');
  if (password !== formData.get('confirmation')) redirect('/reset-password?error=match');

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const reason = error.code === 'weak_password' || error.code === 'same_password' ? 'password' : 'save';
    redirect('/reset-password?error=' + reason);
  }
  await clearRecoverySession();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login?reset=1');
}
