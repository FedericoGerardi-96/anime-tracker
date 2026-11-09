import { Skeleton } from './PageSkeleton';
import styles from '@/components/lists/LibraryTable.module.css';

export default function LibraryTableSkeleton() {
  return <div role="status" aria-label="Actualizando lista…" className="overflow-hidden rounded-2xl border border-border bg-card">
    <span className="sr-only">Actualizando lista…</span>
    <table aria-hidden="true" className={styles.table}>
      <thead><tr>{['Título', 'Mi nota', 'Score', 'Estado', 'Acciones'].map(label => <th key={label}><Skeleton className="h-3 w-12" /></th>)}</tr></thead>
      <tbody>{Array.from({ length: 5 }, (_, index) => <tr key={index}>
        <td><div className="flex items-center gap-3"><Skeleton className="h-[76px] w-[52px] shrink-0" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-2/3" /></div></div></td>
        <td><div className="space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div></td>
        <td><Skeleton className="inline-block h-4 w-8" /></td>
        <td><Skeleton className="h-7 w-20" /></td>
        <td><div className="flex gap-1">{[0,1,2].map(action => <Skeleton key={action} className="size-9 shrink-0" />)}</div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}
