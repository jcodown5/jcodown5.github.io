const {test}=require('node:test');
const assert=require('node:assert/strict');
const {aggregate,orderFor,load}=require('../n01-detail.js');
function fixture(size=3){
 const order=Array.from({length:size},(_,i)=>({oid:'a'+i,oname:'Player '+i}));
 return {mid:'set1',tmid:'match1',schid:'s1',match_type:'01',endMatch:1,statsData:[{tpid:'A',order},{tpid:'B',order:order.map(p=>({...p,oid:'b'+p.oid}))}],legData:[{endFlag:1,first:0,winner:0,playerData:[[{score:0,left:501},{score:180,left:321},{score:100,left:221},{score:140,left:81},{score:0,left:81},{score:-2,left:0}],[{score:0,left:501},{score:60,left:441},{score:0,left:441},{score:100,left:341},{score:60,left:281}]]}]};
}
test('triples: uneven visits, bust, checkout and collective victories',()=>{
 const r=aggregate([fixture()]); const p=r.players.filter(p=>p.tpid==='A');
 assert.deepEqual(p.map(p=>[p.score,p.darts,p.highOut]),[[180,6,0],[181,5,81],[140,3,0]]);
 assert.equal(p.reduce((s,p)=>s+p.score,0),501);assert.equal(p.reduce((s,p)=>s+p.darts,0),14);
 assert.deepEqual(p.map(p=>p.winLeg),[1,1,1]);assert.deepEqual(p.map(p=>p.best),[0,0,0]);assert.equal(p[0].ton80,1);
});
test('pairs cycle independently from which side starts',()=>{
 const m=fixture(2);m.legData[0].first=1;
 const p=aggregate([m]).players.filter(p=>p.tpid==='A');
 assert.deepEqual(p.map(p=>[p.score,p.darts]),[[401,8],[100,6]]);
});
test('leg order override is inherited and resets the visit cycle',()=>{
 const m=fixture(2);m.legData.push(structuredClone(m.legData[0]));m.legData[0].order=[['a1','a0'],['ba0','ba1']];
 assert.deepEqual(orderFor(m,1,0).map(p=>p.oid),['a1','a0']);
 const p=aggregate([m]).players.find(p=>p.oid==='a1');assert.equal(p.score,802);assert.equal(p.match,1);assert.equal(p.set,1);
});
test('personal first nine uses own visits; singles best and mode filtering',()=>{
 const m=fixture(1),p=aggregate([m]).players.find(p=>p.tpid==='A');
 assert.equal(p.f9Score,420);assert.equal(p.f9Darts,9);assert.equal(p.best,14);
 assert.equal(aggregate([m],'2').players.length,0);
 assert.equal(aggregate([m,m]).legs.length,1);
});
test('reject ambiguous identities and invalid checkout',()=>{
 const m=fixture();m.statsData[0].order[0].oid='';assert.throws(()=>aggregate([m]),/Alineación/);
 const n=fixture();n.legData[0].playerData[0].at(-1).score=-4;assert.throws(()=>aggregate([n]),/Cierre/);
});
test('loader paginates and fetches each finished encounter once',async()=>{
 const old=global.fetch;let pages=0,sets=0;
 global.fetch=async url=>({ok:true,json:async()=>{
  if(url.includes('get_t_list')){pages++;return {list:pages===1?Array.from({length:30},(_,i)=>({tmid:'m'+i,endMatch:1})):[{tmid:'m30',endMatch:1}]};}
  sets++;return [fixture()];
 }});
 try{const r=await load('https://example.test/','t_test_1');assert.equal(pages,2);assert.equal(sets,31);assert.equal(r.length,31);}finally{global.fetch=old;}
});
