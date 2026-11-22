/* Public n01 schema: get_t_list -> get_setdata. See docs/n01-statistics.md. */
(function(root){
'use strict';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function orderFor(match, index, side){
  const base = match.statsData[side].order || [];
  let order = base;
  for(let i=index;i>=0;i--){
    const saved = match.legData[i].order?.[side];
    if(saved?.length){ order=saved; break; }
  }
  return order.map(item => {
    const oid = typeof item === 'object' ? item.oid : item;
    return {...base.find(p=>p.oid===oid), ...(typeof item === 'object' ? item : {}), oid};
  });
}
function aggregate(matches, mode='all'){
  const players = new Map(), legs=[], highOut=[], seen=new Set();
  let skipped=0;
  for(const match of matches){
    if(match.delete || !match.endMatch) continue;
    const key=match.mid;
    if(!key) throw Error('Set sin identificador');
    if(seen.has(key)) continue;
    seen.add(key);
    if(match.match_type !== '01' || !Array.isArray(match.legData) || !Array.isArray(match.statsData)) throw Error('Formato de partida no compatible');
    const participants=[new Set(),new Set()], wins=[0,0];
    match.legData.forEach((leg, legIndex)=>{
      if(leg.endFlag!==1) return;
      if(leg.middleForDiddle===1){ skipped++; return; }
      const orders=[orderFor(match,legIndex,0),orderFor(match,legIndex,1)];
      const size=Math.max(...orders.map(o=>o.length));
      if(mode!=='all' && size!==Number(mode)) return;
      if(![1,2,3].includes(size) || orders.some(o=>!o.length || o.some(p=>!p.oid) || new Set(o.map(p=>p.oid)).size!==o.length)) throw Error('Alineación ausente o ambigua');
      if(![0,1].includes(leg.winner)) throw Error('Ganador del leg no identificado');
      wins[leg.winner]++;
      const row={tmid:match.tmid,mid:match.mid,schid:match.schid,title:match.title,leg:legIndex+1,size,first:leg.first,winner:leg.winner,sides:[]};
      for(let side=0;side<2;side++){
        const team=match.statsData[side], order=orders[side], visits=leg.playerData?.[side];
        if(!Array.isArray(visits) || !visits.length) throw Error('Faltan tiradas del leg');
        if(side===leg.winner && !(visits.at(-1)?.score<0)) throw Error('Leg ganado sin cierre verificable');
        const local=new Map();
        for(const member of order){
          const id=team.tpid+':'+member.oid;
          if(!players.has(id)) players.set(id,{...member,tpid:team.tpid,score:0,darts:0,f9Score:0,f9Darts:0,ton00:0,ton40:0,ton80:0,highOut:0,best:0,leg:0,winLeg:0,set:0,winSet:0,match:0,_matches:new Set()});
          const p=players.get(id);
          p.leg++; p.winLeg+=Number(leg.winner===side); participants[side].add(id); p._matches.add(match.tmid);
          local.set(member.oid,{oid:member.oid,oname:member.oname||p.oname||member.oid,score:0,darts:0,visits:0,checkout:0});
        }
        const timeline=[];
        for(let i=1;i<visits.length;i++){
          const v=visits[i], prev=visits[i-1];
          if(!Number.isFinite(v.score)||!Number.isFinite(v.left)||!Number.isFinite(prev.left)) throw Error('Tirada no válida');
          const closing=v.score<0;
          if(closing && (![-1,-2,-3].includes(v.score)||v.left!==0||side!==leg.winner||i!==visits.length-1)) throw Error('Cierre no compatible');
          const points=prev.left-v.left, darts=closing?-v.score:3;
          if(points<0 || points>180 || (!closing && points!==v.score)) throw Error('Puntuación no compatible');
          const member=order[(i-1)%order.length], p=players.get(team.tpid+':'+member.oid), own=local.get(member.oid);
          p.score+=points; p.darts+=darts; own.score+=points; own.darts+=darts; own.visits++;
          if(own.visits<=3){p.f9Score+=points;p.f9Darts+=darts;}
          if(points>=100&&points<140)p.ton00++;
          if(points>=140&&points<180)p.ton40++;
          if(points===180)p.ton80++;
          if(closing){
            p.highOut=Math.max(p.highOut,points);own.checkout=points;
            if(points>=100) highOut.push({tpid:team.tpid,oname:p.oname,schid:match.schid,highOut:points,time:leg.time,mid:match.mid});
            if(size===1){ const total=(i-1)*3+darts; p.best=p.best?Math.min(p.best,total):total; }
          }
          timeline.push({name:own.oname,points,darts,closing});
        }
        row.sides.push({tpid:team.tpid,name:team.name,order:[...local.values()],visits:timeline});
      }
      legs.push(row);
    });
    participants.forEach((ids,side)=>ids.forEach(id=>{const p=players.get(id);p.set++;p.winSet+=Number(wins[side]>wins[1-side]);}));
  }
  return {players:[...players.values()].map(p=>{p.match=p._matches.size;delete p._matches;return p;}),legs,highOut,skipped};
}
async function load(api,id,progress=()=>{}){
  async function json(path){
    const r=await fetch(api+path,{signal:AbortSignal.timeout(30000)});
    if(!r.ok) throw Error('HTTP '+r.status);
    return r.json();
  }
  const history=[],ids=new Set();
  for(let skip=0;;skip+=30){
    const page=await json('n01_history.php?cmd=get_t_list&tdid='+encodeURIComponent(id)+'&skip='+skip+'&count=30&name=');
    if(!Array.isArray(page.list)) throw Error('Historial no disponible');
    let added=0;
    for(const m of page.list) if(m.endMatch && !ids.has(m.tmid)){ids.add(m.tmid);history.push(m);added++;}
    if(page.list.length<30) break;
    if(!added) throw Error('Paginación del historial incompleta');
  }
  let next=0,done=0;const result=[];
  await Promise.all(Array.from({length:Math.min(4,history.length)},async()=>{
    while(next<history.length){
      const m=history[next++];
      const sets=await json('n01_online_t.php?cmd=get_setdata&tmid='+encodeURIComponent(m.tmid));
      if(!Array.isArray(sets)||!sets.length) throw Error('Detalle no disponible: '+m.tmid);
      result.push(...sets); progress(++done,history.length);
    }
  }));
  return result;
}
function render(container,data,tpid){
  const rows=data.legs.filter(l=>l.size>1 && (!tpid||l.sides.some(s=>s.tpid===tpid)));
  container.innerHTML=rows.length?rows.map(l=>'<details style="margin:12px 0"><summary>'+esc(l.size===2?'Parejas':'Tripletas')+' · '+esc(l.sides.map(s=>s.name).join(' / '))+' · leg '+l.leg+' · '+esc(l.schid)+'</summary>'+l.sides.map((s,side)=>'<h3>'+esc(s.name)+(side===l.first?' · sale':'')+(side===l.winner?' · gana el leg':'')+'</h3><p>'+s.order.map((p,i)=>(i+1)+'º '+esc(p.oname)).join(' → ')+'</p><table><thead><tr><th>Jugador</th><th>Puntos</th><th>Dardos</th><th>Media 3D</th><th>Cierre</th></tr></thead><tbody>'+s.order.map(p=>'<tr><td>'+esc(p.oname)+'</td><td>'+p.score+'</td><td>'+p.darts+'</td><td>'+(p.darts?(p.score/p.darts*3).toFixed(2):'—')+'</td><td>'+(p.checkout||'—')+'</td></tr>').join('')+'</tbody></table><p>Visitas de este lado: '+s.visits.map((v,i)=>(i+1)+'. '+esc(v.name)+': '+v.points+' ('+v.darts+' d.)'+(v.closing?' cierre':'')).join(' · ')+'</p>').join('')+'<a target="_blank" rel="noopener" href="https://n01darts.com/n01/tournament/n01_view.html?mid='+encodeURIComponent(l.mid)+'">Ver partida original</a></details>').join(''):'<p>Sin legs de parejas o tripletas en esta selección.</p>';
}
root.N01Detail={aggregate,orderFor,load,render};
if(typeof module!=='undefined') module.exports=root.N01Detail;
})(typeof globalThis!=='undefined'?globalThis:window);
