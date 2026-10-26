/** Read complete collections without relying on the PostgREST row limit.
 * Callers must order by a unique key and build a fresh query for each range.
 * Stop on an empty page (not a short page: the server may cap below our size).
 */
export async function readAllPages<T>(read: (from: number, to: number) => PromiseLike<{
  data: T[] | null;
  error: { message: string; code?: string } | null;
}>, pageSize = 500): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await read(rows.length, rows.length + pageSize - 1);
    // PostgREST can report an exhausted offset as 416 instead of an empty page.
    if (error?.code === 'PGRST103' && rows.length > 0) return rows;
    if (error) throw new Error(error.message);
    if (!data?.length) return rows;
    rows.push(...data);
  }
}

/** Keep IN filters bounded to avoid oversized URLs and row-limit truncation. */
export async function readInBatches<K, T>(keys: K[], read: (batch: K[]) => PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>): Promise<T[]> {
  const rows: T[] = [];
  const unique = [...new Set(keys)];
  for (let start = 0; start < unique.length; start += 100) {
    const { data, error } = await read(unique.slice(start, start + 100));
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}
