import { advanceSyncJob } from '@/services/library-sync-jobs';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  return advanceSyncJob(request);
}
