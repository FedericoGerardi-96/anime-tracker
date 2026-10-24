import Link from 'next/link';
import { LIST_TABS } from '@/lib/lists-navigation';
import type { ListsTabsProps } from '@/interfaces/lists';
export default function ListsTabs({ activeTab }: Readonly<ListsTabsProps>) {
  return (
    <div className='flex items-center gap-2 border-b border-white/10 mb-4 overflow-x-auto no-scrollbar pb-1'>
      {LIST_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/lists?tab=${tab.id}`}
          aria-current={tab.id === activeTab ? 'page' : undefined}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            tab.id === activeTab
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-slate-400 dark:hover:bg-white/5 hover:bg-muted  dark:hover:text-white hover:text-primary'
          }`}
        >
          <span className='material-symbols-outlined text-[18px]'>{tab.icon}</span>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
