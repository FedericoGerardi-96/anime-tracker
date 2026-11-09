import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as editor from '../src/lib/library-editor.ts';
import { cleanListsParams, updateListType } from '../src/lib/lists-toolbar.ts';
import { matchesLibrarySearch } from '../src/lib/library-search.ts';

const id = '00000000-0000-0000-0000-000000000001';
function fixture({ authenticated = true, queueError = false } = {}) {
  const state = { progress: [{id:'p',user_id:'a',media_id:id,status:'watching',current_episode:4,custom_description:'Anterior',custom_tags:['vieja'],watch_link:null,updated_at:'v1'},
    {id:'foreign',user_id:'b',media_id:id,status:'completed',current_episode:12,updated_at:'foreign'}],
    favorites:[{id:'fa',user_id:'a',media_id:id},{id:'fb',user_id:'b',media_id:id}], writes:0 };
  const db = {from(table) {
    const filters = []; let operation = 'read', values;
    const run = () => {
      if (table === 'media') return {data:{id,type:'anime',total_units:12},error:null};
      if (table === 'library_sync_pending') return {data:[],error:queueError ? {message:'missing'} : null};
      const rows = table === 'favorites' ? state.favorites : state.progress;
      const matches = row => filters.every(([key,value]) => row[key] === value);
      if (operation === 'delete') { state.writes++; state.favorites = rows.filter(row => !matches(row)); return {error:null}; }
      if (operation === 'update') { const row = rows.find(matches); if (row) {Object.assign(row,values);state.writes++;} return {data:row ?? null,error:null}; }
      if (operation === 'upsert') {
        if (rows.some(row => row.user_id === values.user_id && row.media_id === values.media_id)) return {data:null,error:null};
        rows.push({id:'new',...values});state.writes++;return {data:rows.at(-1),error:null};
      }
      return {data:rows.find(matches) ?? null,error:null};
    };
    const q = {select(){return q;},eq(k,v){filters.push([k,v]);return q;},is(k,v){filters.push([k,v]);return q;},limit(){return q;},
      update(v){operation='update';values=v;return q;},upsert(v){operation='upsert';values=v;return q;},delete(){operation='delete';return q;},
      maybeSingle:async()=>run(),then(resolve){return Promise.resolve(run()).then(resolve);}};
    return q;
  }};
  const source = ts.transpileModule(fs.readFileSync('src/lib/actions/library-editor.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(source,{exports,Date,Error,URL,require(name){
    if (name === '@/services/supabase') return {getAuthenticatedUser:async()=>authenticated ? {id:'a'} : null,getSupabaseServer:async()=>db};
    if (name === 'next/cache') return {revalidatePath(){}};
    if (name === '@/lib/library-editor') return editor;
    throw Error(name);
  }});
  return {api:exports,state};
}
test('rechaza enlaces ejecutables, credenciales, etiquetas inválidas y episodios negativos', () => {
  assert.equal(editor.safeWatchLink('javascript:alert(1)'),null);
  assert.equal(editor.safeWatchLink('https://user:pass@example.com'),null);
  assert.equal(editor.safeWatchLink('https://example.com/ver'),'https://example.com/ver');
  assert.equal(editor.validLibraryEdit({kind:'progress',status:'watching',episode:-1}),false);
  assert.equal(editor.validLibraryEdit({kind:'metadata',note:'',watchLink:'',tags:['']}),false);
});
test('sin sesión o sin cola no modifica datos', async () => {
  for (const options of [{authenticated:false},{queueError:true}]) {
    const {api,state}=fixture(options);
    assert.ok((await api.saveLibraryEditor(id,{exists:true,revision:'v1'},{kind:'progress',status:'completed',episode:4})).error);
    assert.equal(state.writes,0);
  }
});
test('nota no pisa progreso, normaliza enlace y no altera otro usuario', async () => {
  const {api,state}=fixture();
  const result=await api.saveLibraryEditor(id,{exists:true,revision:'v1'},{kind:'metadata',note:'Nueva',watchLink:'https://example.com',tags:['nueva']});
  assert.equal(result.data.episode,4);
  assert.equal(result.data.status,'watching');
  assert.equal(result.data.note,'Nueva');
  assert.equal(state.progress[1].updated_at,'foreign');
});
test('rechaza una edición antigua y una inserción que encontró un registro nuevo',async()=>{
  const {api,state}=fixture();
  assert.ok((await api.saveLibraryEditor(id,{exists:true,revision:'old'},{kind:'progress',status:'watching',episode:5})).error);
  assert.ok((await api.saveLibraryEditor(id,{exists:false,revision:null},{kind:'progress',status:'watching',episode:5})).error);
  assert.equal(state.writes,0);
});
test('completar usa total y superar total se rechaza',async()=>{
  const {api}=fixture();
  assert.ok((await api.saveLibraryEditor(id,{exists:true,revision:'v1'},{kind:'progress',status:'watching',episode:13})).error);
  const result=await api.saveLibraryEditor(id,{exists:true,revision:'v1'},{kind:'progress',status:'completed',episode:4});
  assert.equal(result.data.episode,12);assert.equal(result.data.status,'completed');
});
test('quitar es idempotente, respeta usuario y conserva progreso',async()=>{
  const {api,state}=fixture();
  await api.removeLibraryFavorite(id);await api.removeLibraryFavorite(id);
  assert.equal(state.favorites.length,1);assert.equal(state.favorites[0].user_id,'b');
  assert.equal(state.progress.length,2);assert.equal(state.progress[0].current_episode,4);
});
test('filtros antiguos no quedan invisibles y tipo conserva búsqueda y colección',()=>{
  const old=new URLSearchParams('tab=library&status=watching&genre=Action&q=amistad&page=8');
  const clean=cleanListsParams(old);
  assert.equal(clean.get('tab'),'watching');assert.equal(clean.get('q'),'amistad');assert.equal(clean.has('genre'),false);assert.equal(clean.has('page'),false);
  const next=updateListType(new URLSearchParams('tab=custom_lists&list=abc&q=amistad&page=2'),'MOVIE');
  assert.equal(next.get('list'),'abc');assert.equal(next.get('q'),'amistad');assert.equal(next.get('format'),'MOVIE,movie');assert.equal(next.has('page'),false);
  assert.equal(matchesLibrarySearch('amistad',[ 'Otro título','Historia de amistad',['noche']]),true);
  assert.equal(matchesLibrarySearch('noche',['Otro título','Nota',['noche']]),true);
});


test('el editor reutiliza los valores y la revisión de la misma fila, incluido un progreso ausente', () => {
  const row={id,malId:1,title:'Serie',image:'',type:'anime',episode:4,status:'watching',total:12,note:'Nota',tags:['noche'],watchLink:'https://example.com'};
  assert.equal(editor.editorSnapshotFromRow(row),null);
  assert.deepEqual(editor.editorSnapshotFromRow({...row,editorVersion:{exists:true,revision:'v1'}}), {
    exists:true,revision:'v1',status:'watching',episode:4,total:12,note:'Nota',tags:['noche'],watchLink:'https://example.com',
  });
  assert.equal(editor.editorSnapshotFromRow({...row,editorVersion:{exists:false,revision:null}}).exists,false);
});
