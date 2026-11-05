import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, mocks = {}) {
 const loaded = { exports: {} };
 const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 vm.runInNewContext(js, { module: loaded, exports: loaded.exports, require: name => { if(name === 'server-only') return {}; if(name in mocks) return mocks[name]; throw Error(name); }, Error, console });
 return loaded.exports;
}
function fixture(row, revision = row.revision) {
 const writes=[], deleted=[];
 const db={from:()=>{
  let deleting=false;
  const q={select(){return q},delete(){deleting=true;return q},eq(k,v){if(deleting)deleted.push([k,v]);return q},in(){return q},order(){return q},limit(){return q},maybeSingle:async()=>({data:{...row,revision},error:null}),then(resolve){resolve({error:null});}};
  return q;
 }};
 const api=load('src/services/pending-library-sync.ts',{
 '@/lib/anilist-sync-policy':{remoteStatus:s=>({watching:'CURRENT',plan_to_watch:'PLANNING',completed:'COMPLETED'})[s]||s},
 '@/services/myanimelist-library':{getMalSyncEntry:async()=>null,setMalAnimeProgress:async(...args)=>writes.push(args),setMalMangaProgress:async(...args)=>writes.push(args),deleteMalSyncEntry:async(...args)=>writes.push(args)}
 });
 const state={accountId:1,types:['anime','manga'],updated:0,unchanged:0};
 return {api,db,writes,deleted,state,job:{user_id:'user',provider:row.provider,state}};
}
const base={user_id:'user',provider:'anilist',account_id:1,media_type:'anime',mal_id:10,operation:'upsert',status:'watching',progress:4,favorite_only:false,revision:'v1'};
test('resolution and write run in separate batches',async()=>{
 const f=fixture(base);let calls=0;
 const graph=async(query)=>{calls++;return query.startsWith('query')?{Page:{media:[{id:20,idMal:10,type:'ANIME',mediaListEntry:null}]}}:{SaveMediaListEntry:{id:30}};};
 await f.api.advancePending(f.db,f.job,'token',graph);assert.equal(calls,1);assert.equal(f.deleted.length,0);assert.ok(f.state.pendingChange);
 await f.api.advancePending(f.db,f.job,'token',graph);assert.equal(calls,2);assert.equal(f.state.updated,1);assert.equal(f.state.pendingChange,undefined);assert.ok(f.deleted.some(([k,v])=>k==='revision'&&v==='v1'));
});
test('newer local revision cancels stale write and stays pending',async()=>{
 const f=fixture(base,'v2');f.state.pendingChange={...base,resolved:{mediaId:20,status:'PLANNING',progress:0}};
 await f.api.advancePending(f.db,f.job,'token',async()=>{throw Error('must not call provider');});assert.equal(f.deleted.length,0);assert.equal(f.state.pendingChange,undefined);
});
test('favorite-only addition preserves remote completed status',async()=>{
 const f=fixture({...base,favorite_only:true});
 await f.api.advancePending(f.db,f.job,'token',async()=>({Page:{media:[{id:20,idMal:10,type:'ANIME',mediaListEntry:{id:30,status:'COMPLETED',progress:12}}]}}));
 assert.equal(f.state.unchanged,1);assert.equal(f.state.pendingChange,undefined);
});
test('pending deletion removes entry by verified AniList entry ID',async()=>{
 const f=fixture({...base,operation:'delete'});f.state.pendingChange={...base,operation:'delete',resolved:{mediaId:20,entryId:30,status:'CURRENT',progress:4}};
 await f.api.advancePending(f.db,f.job,'token',async(query,vars)=>{assert.ok(query.includes('DeleteMediaListEntry'));assert.equal(vars.id,30);return {DeleteMediaListEntry:{deleted:true}};});assert.equal(f.state.updated,1);
});
test('failed write leaves pending change unacknowledged',async()=>{
 const f=fixture(base);f.state.pendingChange={...base,resolved:{mediaId:20,status:'PLANNING',progress:0}};
 await assert.rejects(f.api.advancePending(f.db,f.job,'token',async()=>{throw Error('timeout');}));assert.equal(f.deleted.length,0);
});
test('MAL manga uses reading status and final chapter count',async()=>{
 const row={...base,provider:'myanimelist',media_type:'manga'};const f=fixture(row);f.state.pendingChange={...row,resolved:{mediaId:10,status:'PLANNING',progress:0}};
 await f.api.advancePending(f.db,f.job,'token',async()=>{throw Error('no AniList');});assert.deepEqual(f.writes[0],['token',10,'reading',4,true]);
});
test('local mutation entry points do not import remote synchronization or enrichment',()=>{
 for(const file of ['src/lib/actions/media.ts','src/lib/actions/lists.ts'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/syncMedia(?:Favorite|Progress)WithProviders|getCanonicalMediaInput/);
});
