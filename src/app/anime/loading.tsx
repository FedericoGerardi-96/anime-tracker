import { CatalogSkeleton } from '@/components/fallbacks/PageSkeleton';
export default function Loading() { return <div className="flex-1 space-y-8 p-4 sm:p-8 lg:p-12"><h1 className="text-3xl font-black">Catálogo de anime</h1><CatalogSkeleton /></div>; }
