import Link from 'next/link';
import type { CustomListsGridProps } from '@/interfaces/lists';
import CreateListButton from './CreateListButton';
export default function CustomListsGrid({ lists }: CustomListsGridProps) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'>
      {lists.map((list) => (
        <Link
          href={`/lists?tab=custom_lists&list=${encodeURIComponent(list.id)}`}
          key={list.id}
          className='group relative bg-card p-5 rounded-3xl border border-border hover:border-primary/50 transition-all cursor-pointer shadow-xl overflow-hidden block'
        >
          <div className='absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] group-hover:bg-primary/20 transition-colors pointer-events-none' />

          <div className='flex justify-between items-start mb-6'>
            <div className='w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center '>
              <span className='material-symbols-outlined text-primary text-2xl'>folder</span>
            </div>
          </div>

          <h3 className='font-black text-xl text-foreground mb-2 truncate relative z-10'>{list.name}</h3>
          {list.description && (
            <p className='text-sm text-muted-foreground line-clamp-2 mb-4 h-10 relative z-10'>{list.description}</p>
          )}

          <div className='pt-4 border-t border-border flex items-center justify-between text-xs font-bold relative z-10'>
            <span className='text-muted-foreground'>Colección personalizada</span>
            <span className='text-primary  '>Ver elementos</span>
          </div>
        </Link>
      ))}

      <div className="flex items-center justify-center rounded-3xl border-2 border-dashed border-border p-5"><CreateListButton /></div>
    </div>
  );
}
