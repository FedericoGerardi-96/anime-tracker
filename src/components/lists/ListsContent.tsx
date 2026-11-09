import LibraryTableSkeleton from '@/components/fallbacks/LibraryTableSkeleton';
import { hydrateLibraryRows } from '@/services/library-table';
import Link from "next/link";
import ListHero from "./ListHero";
import { CatalogInteraction, CatalogResultsArea } from "@/components/catalog/CatalogInteraction";
import { notFound } from "next/navigation";

import { getListsPageData } from "@/services/lists-page";
import type { ListsContentProps } from "@/interfaces/lists";
import { LIST_TABS } from "@/lib/lists-navigation";
import LibraryToolbar from "./LibraryToolbar";
import LibraryTable from "./LibraryTable";
import { listTableRows } from "@/lib/library-table-data";
import Pagination from "@/components/ui/Pagination";
import CustomListsGrid from "./CustomListsGrid";
export default async function ListsContent({
  options,
}: Readonly<ListsContentProps>) {
  const data = await getListsPageData(options);
  const tableRows = await hydrateLibraryRows(listTableRows(data.items));
  const folders = options.tab === "custom_lists" && !options.listId;
  if (options.listId && !data.selectedList) notFound();
  return (
    <CatalogInteraction>
    <div className="min-h-[50vh] space-y-6">
      {folders ? <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Mis listas · {folders || data.selectedList ? 'Colecciones' : 'Biblioteca'}</p>
        <h1 className="break-words text-3xl font-extrabold sm:text-4xl">{data.selectedList?.name ?? LIST_TABS.find(tab => tab.id === options.tab)?.label}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{data.selectedList?.description || (folders ? 'Organizá tus historias en colecciones propias.' : 'Tus historias y tu progreso, en un mismo lugar.')}</p>
      </header> : <ListHero tab={options.tab} listId={options.listId} title={data.selectedList?.name ?? LIST_TABS.find(tab => tab.id === options.tab)?.label ?? "Biblioteca"} description={data.selectedList?.description} />}
      {folders ? (
        <>
          <form action="/lists" className="flex gap-3">
            <input type="hidden" name="tab" value="custom_lists" />
            <input
              key={options.query}
              name="q"
              defaultValue={options.query}
              aria-label="Buscar listas"
              placeholder="Buscar listas por nombre o descripción"
              className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-3"
            />
            <button type="submit" className="rounded-xl bg-primary px-5 font-bold text-primary-foreground">
              Buscar
            </button>
          </form>
          <h2 className="sr-only">Listas personalizadas</h2>
          <CustomListsGrid lists={data.lists} />
          {data.totalCount === 0 && (
            <p className="text-muted-foreground">
              {options.query
                ? "No encontramos listas con esa búsqueda."
                : "Todavía no creaste listas personalizadas."}
            </p>
          )}
        </>
      ) : (
        <>
          {data.selectedList && (
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
              <Link
                href="/lists?tab=custom_lists"
                aria-label="Volver a mis listas"
                className="material-symbols-outlined"
              >
                arrow_back
              </Link>
              <span className="text-sm font-semibold">Todas mis colecciones</span>
            </div>
          )}
          <div className="space-y-6">
          <LibraryToolbar />
          <CatalogResultsArea fallback={<LibraryTableSkeleton />}>
          <h2 className="sr-only">{data.selectedList?.name ?? LIST_TABS.find((tab) => tab.id === options.tab)?.label ?? "Elementos de la lista"}</h2>
          <LibraryTable rows={tableRows} />
          <p className="mt-4 text-sm text-muted-foreground">{data.totalCount} elementos</p>
          <Pagination currentPage={options.page} totalPages={data.totalPages} />
          </CatalogResultsArea>
          </div>
        </>
      )}
      {folders && <>
      <p className="text-sm text-muted-foreground">
        {data.totalCount} {folders ? "listas" : "elementos"}
      </p>
      {data.totalCount > 0 && options.page > data.totalPages && (
        <Link
          href={`/lists?tab=${options.tab}${options.listId ? "&list=" + encodeURIComponent(options.listId) : ""}`}
        >
          Volver a la primera página
        </Link>
      )}
      <Pagination
        currentPage={options.page}
        totalPages={data.totalPages}
      />
      </>}
    </div>
    </CatalogInteraction>
  );
}
