
'use client';
import { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
}

export default function Pagination({ currentPage, totalPages, hasNextPage }: Readonly<PaginationProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={`flex justify-center items-center gap-2 py-12 ${isPending ? 'opacity-60 pointer-events-none' : ''} transition-opacity duration-200`}>
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={isPending || currentPage <= 1}
        className="size-10 flex items-center justify-center rounded-xl glass hover:bg-primary/20 transition-all border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className="material-symbols-outlined text-sm">chevron_left</span>
      </button>

      {startPage > 1 && (
        <>
          <button
            onClick={() => handlePageChange(1)}
            disabled={isPending}
            className="size-10 flex items-center justify-center rounded-xl glass hover:bg-primary/20 transition-all border border-white/5 font-bold text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            1
          </button>
          {startPage > 2 && <span className="text-text-muted px-1 text-xs">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          disabled={isPending}
          className={`size-10 flex items-center justify-center rounded-xl transition-all border font-bold text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
            currentPage === page
              ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
              : "glass border-white/5 text-text-muted hover:bg-primary/20 hover:text-text-primary"
          }`}
        >
          {page}
        </button>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="text-text-muted px-1 text-xs">...</span>}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={isPending}
            className="size-10 flex items-center justify-center rounded-xl glass hover:bg-primary/20 transition-all border border-white/5 font-bold text-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={isPending || !hasNextPage}
        className="size-10 flex items-center justify-center rounded-xl glass hover:bg-primary/20 transition-all border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  );
}
