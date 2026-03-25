
import { Metadata } from 'next';
import Link from 'next/link';
import { getCharacterList } from '@/lib/jikan-service';
import { slugify } from '@/lib/utils';
import Pagination from '@/components/ui/Pagination';

export const metadata: Metadata = {
  title: "Character Library",
  description: "Browse and filter the latest and most popular characters from anime and manga.",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CharacterSearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const page = Number(params.page) || 1;

  const { data: characters, pagination } = await getCharacterList(query, page);

  return (
    <main className="min-h-screen pt-24 lg:pt-28 pb-12">
      <div className="max-w-[1400px] mx-auto p-6 md:p-10">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            Search Characters — <span className="text-primary">"{query}"</span>
          </h1>
          <p className="text-slate-400">Discover characters from across the expansive anime and manga universe.</p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {characters.map((char: any) => (
            <Link 
              key={char.mal_id}
              href={`/characters/${char.mal_id}-${slugify(char.name)}`}
              className="group bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all hover:scale-[1.02] shadow-xl"
            >
              <div className="aspect-[3/4] relative overflow-hidden">
                <img 
                  src={char.images.webp?.image_url || char.images.jpg.image_url} 
                  alt={char.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80"></div>
              </div>
              <div className="p-4">
                <h3 className="text-white font-bold group-hover:text-primary transition-colors truncate">{char.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{char.name_kanji || 'Cast'}</p>
                <div className="flex items-center gap-1 mt-3">
                    <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    <span className="text-[10px] font-bold text-slate-300">{char.favorites?.toLocaleString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {characters.length === 0 && (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">search_off</span>
            <h3 className="text-xl font-bold text-white mb-2">No characters found</h3>
            <p className="text-slate-500">We couldn't find any characters matching your search.</p>
          </div>
        )}

        {pagination?.last_visible_page > 1 && (
          <div className="mt-12">
            <Pagination 
              currentPage={page}
              totalPages={pagination.last_visible_page}
              hasNextPage={pagination.has_next_page}
            />
          </div>
        )}
      </div>
    </main>
  );
}
