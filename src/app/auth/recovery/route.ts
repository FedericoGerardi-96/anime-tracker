import type { NextRequest } from 'next/server';
import { setRecoverySession } from '@/lib/password-recovery';
import { createClient } from '@/lib/supabase/server';

function goTo(path: string) {
  // Keep the browser's host, even if the server normalized its internal URL.
  return new Response(null, { status: 303, headers: { Location: path, 'Cache-Control': 'no-store' } });
}

export async function GET(request: NextRequest) {
  const fail = () => goTo('/forgot-password?error=expired');
  const code = request.nextUrl.searchParams.get('code');
  if (!code || code.length > 1024) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  // auth-js includes the PKCE verifier's redirect type at runtime.
  if (error || !data.session || !('redirectType' in data) || data.redirectType !== 'PASSWORD_RECOVERY') return fail();

  const { data: verified, error: claimsError } = await supabase.auth.getClaims(data.session.access_token);
  const sessionId = verified?.claims.session_id;
  if (claimsError || typeof sessionId !== 'string' || !sessionId) return fail();

  const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
  await setRecoverySession(sessionId, secure);
  return goTo('/reset-password');
}
