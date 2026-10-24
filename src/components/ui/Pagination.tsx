'use client';

import { Fragment, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { PaginationProps } from '@/interfaces/pagination';

const buttonClass = 'flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer';

export default function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  showBoundaryPages = true,
}: Readonly<PaginationProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const hasKnownTotal = typeof totalPages === 'number' && Number.isFinite(totalPages);
  const lastPage = hasKnownTotal
    ? Math.min(Math.max(0, Math.floor(totalPages)), hasNextPage === false ? currentPage : Infinity)
    : undefined;
  const canGoBack = currentPage > 1;
  const canGoForward = lastPage === undefined ? Boolean(hasNextPage) : currentPage < lastPage;

  if (currentPage < 1 || (lastPage !== undefined && (lastPage <= 1 || currentPage > lastPage))) return null;
  if (!canGoBack && !canGoForward) return null;

  const pages: number[] = [];
  if (lastPage !== undefined && showBoundaryPages && lastPage <= 7) {
    for (let page = 1; page <= lastPage; page++) pages.push(page);
  } else if (lastPage !== undefined && showBoundaryPages) {
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(lastPage - 1, currentPage + 1);
    pages.push(1);
    for (let page = start; page <= end; page++) pages.push(page);
    pages.push(lastPage);
  } else {
    const start = Math.max(1, currentPage - 2);
    const end = lastPage === undefined
      ? currentPage + (canGoForward ? 1 : 0)
      : Math.min(lastPage, currentPage + 2);
    for (let page = start; page <= end; page++) pages.push(page);
  }

  const goToPage = (page: number) => {
    if (page < 1 || (lastPage !== undefined && page > lastPage) || page === currentPage || isPending) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (page === 1) params.delete('page');
      else params.set('page', String(page));
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };

  return (
    <nav aria-label="Paginación" className={`mt-10 flex justify-center transition-opacity ${isPending ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card/90 p-2 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          aria-label="Página anterior"
          onClick={() => goToPage(currentPage - 1)}
          disabled={!canGoBack || isPending}
          className={buttonClass}
        >
          <span aria-hidden="true" className="material-symbols-outlined">chevron_left</span>
        </button>

        {pages.map((page, index) => (
          <Fragment key={page}>
            {index > 0 && page - pages[index - 1] > 1 && (
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">…</span>
            )}
            <button
              type="button"
              aria-label={`Ir a la página ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              onClick={() => goToPage(page)}
              disabled={isPending}
              className={`${buttonClass} ${page === currentPage ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' : ''}`}
            >
              {page}
            </button>
          </Fragment>
        ))}

        <button
          type="button"
          aria-label="Página siguiente"
          onClick={() => goToPage(currentPage + 1)}
          disabled={!canGoForward || isPending}
          className={buttonClass}
        >
          <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </nav>
  );
}
