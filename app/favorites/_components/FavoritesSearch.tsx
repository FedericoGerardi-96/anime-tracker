"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

export default function FavoritesSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const current = new URLSearchParams(searchParams.toString());
      for (const [name, value] of Object.entries(params)) {
        if (value === null || value === "") {
          current.delete(name);
        } else {
          current.set(name, value);
        }
      }
      return current.toString();
    },
    [searchParams]
  );

  const handleSearch = useDebouncedCallback((value: string) => {
    startTransition(() => {
      // Reset to page 1 whenever query changes
      router.push(`${pathname}?${createQueryString({ q: value || null, page: "1" })}`);
    });
  }, 400);

  return (
    <div className="relative group flex-1 min-w-[220px]">
      <span
        className={`absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl transition-colors ${
          isPending ? "text-primary animate-pulse" : "text-slate-500 group-focus-within:text-primary"
        }`}
      >
        {isPending ? "sync" : "search"}
      </span>
      <input
        type="text"
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by title, description or tags..."
        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
      />
    </div>
  );
}
