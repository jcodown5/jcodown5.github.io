const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const women=require('../n01-jugadoras.js');
test('first name only, accents, licence prefixes and ambiguous names',()=>{
 for(const oname of ['422 MARÍA DOLORES CASCALES','  Iolanda Riba','JÚLIA Gómez','Uxue Lorca']) assert.equal(women.includes({oname},'t'),true,oname);
 for(const oname of ['JOSEP MARIA SALVADO','ARTURO MIGUEL ELENA','Alex Romero','Joan Vilagrassa','',null])assert.equal(women.includes({oname},'t'),false,oname);
});
test('explicit corrections are scoped to player, team and tournament',()=>{
 const p={oid:'p',tpid:'A',oname:'Alex'};
 women.overrides['t:A:p']=true;
 assert.equal(women.includes(p,'t'),true);assert.equal(women.includes(p,'other'),false);
 women.overrides['t:A:p']=false;p.oname='Maria';assert.equal(women.includes(p,'t'),false);
 delete women.overrides['t:A:p'];
});
test('weighted cohort average and empty states',()=>{
 const p=[{oname:'Maria',tpid:'A',score:100,darts:3},{oname:'Judit',tpid:'B',score:100,darts:6},{oname:'Jose',tpid:'A',score:180,darts:3}];
 const s=women.summary(women.filter(p,'t','women'));assert.equal(s.avg,200/9*3);assert.equal(s.count,2);assert.equal(s.teams,2);
 assert.equal(women.summary([]).avg,0);assert.match(women.note([],'women'),/no confirma/);assert.equal(women.filter(p,'t','all').length,3);
});
for(const file of ['jugadoras.html','dashboard.html','equipo.html']) test(file+' filters and restores full statistics without refetching',async()=>{
 const els=new Map();const get=id=>{
  if(!els.has(id))els.set(id,{value:id==='categorySel'?'women':id==='modeSel'?'all':id==='minLegs'?'auto':id==='teamSel'?'A':'',style:{},innerHTML:'',textContent:'',hidden:false,events:{},addEventListener(event,fn){this.events[event]=fn;},querySelectorAll(){return [];},closest(){return this;}});
  return els.get(id);
 };
 const match={mid:'set',tmid:'match',schid:'s',match_type:'01',endMatch:1,statsData:[{tpid:'A',name:'Team A',order:[{oid:'m',oname:'Maria'}]},{tpid:'B',name:'Team B',order:[{oid:'j',oname:'Jose'}]}],legData:[{endFlag:1,first:0,winner:0,playerData:[[{score:0,left:100},{score:-2,left:0}],[{score:0,left:100}]]}]};
 let fetches=0;
 const ctx={console,URLSearchParams,AbortSignal,document:{getElementById:get,querySelectorAll:()=>[]},location:{search:'',pathname:'/'+file},history:{replaceState(){}},requestAnimationFrame(){},performance:{now:()=>0},fetch:async url=>{fetches++;return {ok:true,json:async()=>{
  if(url.includes('get_t_list'))return {list:[{tmid:'match',endMatch:1}]};
  if(url.includes('get_setdata'))return [match];
  if(url.includes('get_entry_list'))return [{tpid:'A',name:'Team A'},{tpid:'B',name:'Team B'}];
  if(url.includes('get_data'))return {title:'Test'};
  if(url.includes('player_stats_list'))return {m:{tpid:'A',oname:'Maria'}};
  return Object.fromEntries(['A','B'].map(t=>[t,{match:1,winMatch:1,leg:1,winLeg:1,score:100,darts:3,ton80:0,highOut:100,best:2}]));
 }}}};
 vm.createContext(ctx);
 for(const script of ['n01-nav.js','n01-detail.js','n01-jugadoras.js'])vm.runInContext(fs.readFileSync(script,'utf8'),ctx);
 vm.runInContext(fs.readFileSync(file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 get('urlInput').value='t_test_1';await vm.runInContext('load()',ctx);
 assert.doesNotMatch(get('status').textContent,/No se han podido/);
 assert.equal(get('nav-women').href,'jugadoras.html?id=t_test_1');
 const before=fetches;
 if(file!=='jugadoras.html'){
  assert.equal(els.has('categorySel'),false);
  if(file==='equipo.html')assert.match(get('t-players').innerHTML,/Maria/);
  else assert.match(get('c-avg3').innerHTML,/Maria/);
  get('modeSel').value='3';get('modeSel').events.change();
  assert.equal(fetches,before);
  return;
 }
 assert.match(get('t-women').innerHTML,/Maria/);
 assert.doesNotMatch(get('t-women').innerHTML,/Jose/);
 assert.match(get('categoryNote').textContent,/1 jugadoras/);
 assert.equal(get('t-teams').hidden,true);assert.match(get('kpis').innerHTML,/Media 3D jugadoras/);
 assert.match(get('detailNote').textContent,/todos los equipos del torneo/);
 get('modeSel').value='3';get('modeSel').events.change();assert.match(get('categoryNote').textContent,/No se han identificado/);
 get('modeSel').value='all';get('modeSel').events.change();assert.match(get('t-women').innerHTML,/Maria/);
 assert.equal(fetches,before);
});

test('complete league table includes more than ten players from multiple teams',()=>{
 const box={innerHTML:''};
 women.table(box,Array.from({length:17},(_,i)=>({oname:'Maria '+i,teamName:'Equipo '+i,score:100,darts:3,ton80:0})));
 assert.equal((box.innerHTML.match(/<tr>/g)||[]).length,18);
 assert.match(box.innerHTML,/Equipo 16/);
 women.table(box,[{oname:'<script>',teamName:'A&B',score:0,darts:0}]);
 assert.match(box.innerHTML,/&lt;script&gt;/);assert.match(box.innerHTML,/A&amp;B/);
});
