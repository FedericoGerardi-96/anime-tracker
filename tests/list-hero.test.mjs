import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeList, rouletteCandidates, sampleItems } from '../src/lib/list-hero.ts';
const item = (id, extra = {}) => ({ id, malId: 1, title: id, image: '', type: 'anime', status: null, episode: 0, total: 12, ...extra });

test('resume progreso, sin inventar duración ni contar manga como episodios', () => {
  assert.deepEqual(summarizeList([
    item('done', {status:'completed',episode:12}), item('watching',{status:'watching',episode:5}),
    item('unknown',{total:null}), item('manga',{type:'manga',total:100}),
    item('over',{episode:20}),
  ]), {total:5,completed:1,remaining:4,episodes:7,unknown:1});
  assert.deepEqual(summarizeList([]), {total:0,completed:0,remaining:0,episodes:0,unknown:0});
});
test('ruleta excluye manga, completados y estados distintos de pendiente', () => {
  const items = [item('new'),item('plan',{status:'plan_to_watch'}),item('done',{status:'completed'}),item('watch',{status:'watching'}),item('drop',{status:'dropped'}),item('manga',{type:'manga'})];
  assert.deepEqual(rouletteCandidates(items).map(item => item.id), ['new','plan']);
});
test('portadas sin repetición, no muta y acepta listas menores a tres', () => {
  const items = ['a','b'];
  assert.deepEqual(sampleItems(items,3,()=>0), ['a','b']);
  assert.deepEqual(items,['a','b']);
  assert.deepEqual(sampleItems([],3),[]);
});
