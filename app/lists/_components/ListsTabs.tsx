'use client';

const TABS = [
  { id: 'watching', label: 'Watching', icon: 'visibility' },
  { id: 'completed', label: 'Completed', icon: 'done_all' },
  { id: 'plan_to_watch', label: 'Plan to Watch', icon: 'schedule' },
  { id: 'on_hold', label: 'On Hold', icon: 'pause_circle' },
  { id: 'dropped', label: 'Dropped', icon: 'cancel' },
  { id: 'custom_lists', label: 'Custom Lists', icon: 'folder_special' },
];

interface ListsTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function ListsTabs({ activeTab, onTabChange }: ListsTabsProps) {
  return (
    <div className='flex items-center gap-2 border-b border-white/10 mb-4 overflow-x-auto no-scrollbar pb-1'>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            tab.id === activeTab
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <span className='material-symbols-outlined text-[18px]'>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export { TABS };
