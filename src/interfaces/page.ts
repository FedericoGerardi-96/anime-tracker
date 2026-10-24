export type CatalogSearchParams = Record<string, string | string[] | undefined>;
export interface CatalogPageProps { searchParams: Promise<CatalogSearchParams> }
export interface CatalogResultsProps { params: CatalogSearchParams }
export interface DetailPageProps { params: Promise<{ slug: string }> }
export interface DetailContentProps { slug: string }
