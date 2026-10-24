import ScheduleSkeleton from '@/components/fallbacks/ScheduleSkeleton';
import { Skeleton } from '@/components/fallbacks/PageSkeleton';
export default function Loading() { return <div className="flex-1 space-y-6 p-4 sm:p-8 lg:p-12"><Skeleton className="h-4 w-64" /><ScheduleSkeleton /></div>; }
