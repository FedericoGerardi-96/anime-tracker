import TranslatedSynopsis from '@/components/media/TranslatedSynopsis';
import type { MediaSynopsisProps } from '@/interfaces/media-detail-components';
export default function MediaSynopsis(props: Readonly<MediaSynopsisProps>) {
  return <TranslatedSynopsis {...props} />;
}
