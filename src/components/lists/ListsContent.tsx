import Link from "next/link";
import { CatalogInteraction, CatalogResultsArea } from "@/components/catalog/CatalogInteraction";
import { notFound } from "next/navigation";

import { getListsPageData } from "@/services/lists-page";
import type { ListsContentProps } from "@/interfaces/lists";
import { LIST_TABS } from "@/lib/lists-navigation";
import LibraryFilterBar from "@/components/library/LibraryFilterBar";
import Pagination from "@/components/ui/Pagination";
import MediaGrid from "./MediaGrid";
import CustomListsGrid from "./CustomListsGrid";
export default async function ListsContent({
  options,
}: Readonly<ListsContentProps>) {
  const data = await getListsPageData(options);
  const folders = options.tab === "custom_lists" && !options.listId;
  if (options.listId && !data.selectedList) notFound();
  return (
    <CatalogInteraction>
    <div className="min-h-[50vh] space-y-6">
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
            <button type="submit" className="rounded-xl bg-primary px-5 font-bold text-white">
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
              <h2 className="text-xl font-bold">{data.selectedList.name}</h2>
            </div>
          )}
          <div className="grid items-start gap-6 lg:grid-cols-[276px_minmax(0,1fr)]">
          <LibraryFilterBar
            availableTags={data.facets.tags}
            availableGenres={data.facets.genres}
            availableYears={data.facets.years}
            availableFormats={data.facets.formats}
            defaultQuery={options.query}
            showStatus={Boolean(options.listId)}
          />
          <CatalogResultsArea>
          <h2 className="sr-only">{data.selectedList?.name ?? LIST_TABS.find((tab) => tab.id === options.tab)?.label ?? "Elementos de la lista"}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <MediaGrid
              items={data.items}
              searchQuery={options.query ?? ""}
              activeTabLabel={
                LIST_TABS.find((tab) => tab.id === options.tab)?.label ?? ""
              }
              selectedListName={data.selectedList?.name}
            />
          </div>
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
