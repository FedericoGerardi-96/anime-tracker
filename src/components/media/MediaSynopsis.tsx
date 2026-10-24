import TranslatedSynopsis from '@/components/media/TranslatedSynopsis';
import { getAuthenticatedUser } from '@/services/supabase';
import type { MediaSynopsisProps } from '@/interfaces/media-detail-components';
export default async function MediaSynopsis(props: Readonly<MediaSynopsisProps>) {
  const user = await getAuthenticatedUser();
  return <TranslatedSynopsis {...props} canSave={Boolean(user)} />;
}
