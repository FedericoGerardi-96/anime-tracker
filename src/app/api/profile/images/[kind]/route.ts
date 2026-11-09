import { revalidatePath } from 'next/cache';
import { isProfileImageKind, PROFILE_IMAGE_BUCKET, profileImagePath } from '@/lib/profile-image';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { encodeProfileImage, ProfileImageInputError, readProfileImage } from '@/services/profile-image-encoding';
import { getAuthenticatedUser } from '@/services/supabase';

export const runtime = 'nodejs';

export async function PUT(request: Request, context: RouteContext<'/api/profile/images/[kind]'>) {
  return updateImage(request, context, 'replace');
}

export async function DELETE(request: Request, context: RouteContext<'/api/profile/images/[kind]'>) {
  return updateImage(request, context, 'remove');
}

async function updateImage(request: Request, { params }: RouteContext<'/api/profile/images/[kind]'>, operation: 'replace' | 'remove') {
  // Next may normalize request.url to the internal hostname behind a proxy.
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
  const scheme = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || new URL(request.url).protocol.slice(0, -1);
  const site = request.headers.get('sec-fetch-site');
  if (!host || (site && site !== 'same-origin') || request.headers.get('origin') !== `${scheme}://${host}`) {
    return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  }
  const { kind } = await params;
  if (!isProfileImageKind(kind)) return Response.json({ error: 'Imagen desconocida.' }, { status: 404 });
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: 'Iniciá sesión para cambiar tus imágenes.' }, { status: 401 });

  try {
    // The caller controls neither the account nor the object path.
    const path = profileImagePath(user.id, kind);
    const bucket = createSupabaseAdminClient().storage.from(PROFILE_IMAGE_BUCKET);
    const { error } = operation === 'replace'
      ? await bucket.upload(path, await encodeProfileImage(await readProfileImage(request), kind), {
        upsert: true, contentType: 'image/webp', cacheControl: '60',
      })
      : await bucket.remove([path]);
    if (error) throw error;
  } catch (error) {
    if (error instanceof ProfileImageInputError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: 'No pudimos actualizar la imagen. Probá de nuevo.' }, { status: 502 });
  }

  revalidatePath('/profile');
  revalidatePath('/settings/profile');
  revalidatePath('/users/[username]', 'page');
  revalidatePath('/friends');
  return new Response(null, { status: 204 });
}
