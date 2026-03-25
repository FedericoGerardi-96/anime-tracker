"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface Props {
  currentPage: number;
  totalPages: number;
}

export default function HentaiPaginator({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (page: number) => {
      const current = new URLSearchParams(searchParams.toString());
      current.set("page", String(page));
      return current.toString();
    },
    [searchParams]
  );

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(`${pathname}?${createQueryString(page)}`);
  };

  const buildPages = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;
  const pages = buildPages();

  return (
    <div className="mt-20 flex justify-center">
      <nav className="glass-card flex items-center p-2 rounded-2xl gap-1 border border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="w-10 h-10 flex items-center justify-center text-slate-600 select-none">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p as number)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm transition-all cursor-pointer ${
                p === currentPage
                  ? "bg-primary text-white shadow-[0_0_15px_rgba(141,49,227,0.4)] shadow-primary/40"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </nav>
    </div>
  );
}
