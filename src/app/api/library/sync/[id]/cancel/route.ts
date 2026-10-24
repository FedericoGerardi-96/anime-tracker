import { cancelSyncJob } from "@/services/library-sync-jobs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return cancelSyncJob(request, (await context.params).id);
}
