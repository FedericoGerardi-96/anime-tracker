import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const recoveryCookie = 'anitrack-password-recovery';
const cookieOptions = { path: '/reset-password', httpOnly: true, sameSite: 'lax' } as const;

export async function setRecoverySession(sessionId: string, secure: boolean) {
  (await cookies()).set(recoveryCookie, sessionId, { ...cookieOptions, secure, maxAge: 15 * 60 });
}

export async function clearRecoverySession() {
  (await cookies()).set(recoveryCookie, '', { ...cookieOptions, maxAge: 0 });
}

export async function getRecoveryClient() {
  const sessionId = (await cookies()).get(recoveryCookie)?.value;
  if (!sessionId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && data?.claims.session_id === sessionId ? supabase : null;
}
