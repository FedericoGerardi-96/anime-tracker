export const listTypeOptions = [
  { value: 'all', label: 'Todos los tipos' }, { value: 'anime', label: 'Todo el anime' },
  { value: 'TV', label: 'Serie de anime' }, { value: 'MOVIE', label: 'Película' },
  { value: 'OVA', label: 'OVA' }, { value: 'ONA', label: 'ONA' }, { value: 'SPECIAL', label: 'Especial' },
  { value: 'manga', label: 'Todo el manga' }, { value: 'NOVEL', label: 'Novela' }, { value: 'ONE_SHOT', label: 'One-shot' },
];
export const listSortOptions = [
  {value:'Date Added:desc',label:'Agregados recientemente'}, {value:'Title:asc',label:'Título A–Z'},
  {value:'Title:desc',label:'Título Z–A'}, {value:'Score:desc',label:'Mayor puntuación'},
  {value:'Score:asc',label:'Menor puntuación'}, {value:'Year:desc',label:'Más recientes por año'},
];
const obsolete = ['tags','status','genre','excludeGenre','catalogStatus','year','yearFrom','yearTo','season','minScore','scoreBands'];
export function cleanListsParams(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  const status = next.get('status');
  if (status && (!next.get('tab') || next.get('tab') === 'library') && ['watching','plan_to_watch','completed','on_hold','dropped'].includes(status ?? '')) next.set('tab', status);
  const removed = obsolete.some(key => next.has(key));
  obsolete.forEach(key => next.delete(key));
  if (removed) next.delete('page');
  return next;
}
export function updateListType(params: URLSearchParams, value: string) {
  const next = new URLSearchParams(params);
  next.delete('type'); next.delete('format'); next.delete('page');
  if (value === 'anime' || value === 'manga') next.set('type', value);
  else if (value !== 'all' && listTypeOptions.some(option => option.value === value)) {
    next.set('type', ['NOVEL','ONE_SHOT'].includes(value) ? 'manga' : 'anime');
    next.set('format', value + ',' + value.toLowerCase());
  }
  return next;
}
