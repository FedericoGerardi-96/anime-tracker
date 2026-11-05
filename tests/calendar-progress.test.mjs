import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function action(current) {
  const js=ts.transpileModule(fs.readFileSync('src/lib/actions/lists.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const saved={ exports:{} };
  const db={from(table){
    const filters={},query={
      select(){return query;}, eq(field,value){filters[field]=value;return query;},
      single(){return {data:{mal_id:12,type:'anime'},error:null};},limit(){return {error:null};},
      update(value){query.value=value;return query;},
      upsert(value,options){assert.equal(options.ignoreDuplicates,true);query.insert=value;return query;},
      maybeSingle(){
        assert.equal(table,'user_media_progress');
        if(query.insert && !current)current=query.insert;
        else if(query.value && current && Object.entries(filters).every(([key,value])=>current[key]===value))current={...current,...query.value};
        else return {data:null,error:null};
        return {data:{id:1},error:null};
      },
    };
    return query;
  }};
  const imports={'@/lib/read-all-pages':{},'@/lib/supabase/server':{createClient:async()=>db},'@/services/supabase':{getAuthenticatedUser:async()=>({id:'me'})},'next/cache':{revalidatePath(){}}};
  vm.runInNewContext(js,{module:saved,exports:saved.exports,require:key=>imports[key]});
  const mark=(previous)=>saved.exports.updatePersonalProgress({mediaId:'series',malId:12,mediaType:'anime',status:'watching',currentEpisode:previous+1,previous:{episode:previous,status:'watching'}});
  return {mark,read:()=>current};
}
test('una pestaña antigua no reduce el progreso que ya se guardó',async()=>{
  const f=action({user_id:'me',media_id:'series',current_episode:7,status:'watching'});
  assert.ok((await f.mark(2)).error);assert.equal(f.read().current_episode,7);
});
test('el primer episodio crea el progreso faltante y un segundo clic no lo duplica',async()=>{
  const f=action(null);
  assert.ok((await f.mark(0)).success);assert.ok((await f.mark(0)).error);
  assert.equal(f.read().current_episode,1);
});
