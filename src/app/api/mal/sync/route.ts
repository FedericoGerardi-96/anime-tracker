import { readSyncJobs, startSyncJob } from "@/services/library-sync-jobs";
export const dynamic = "force-dynamic";
export async function GET() { return readSyncJobs("myanimelist"); }
export async function POST(request: Request) { return startSyncJob(request, "myanimelist"); }
