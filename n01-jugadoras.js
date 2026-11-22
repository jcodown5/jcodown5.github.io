/* Identificación orientativa por el primer nombre, solicitada por el propietario.
   No es una categoría oficial de n01. Las excepciones prevalecen sobre el nombre. */
(function(root){
'use strict';
const firstNames = new Set('iolanda yolanda estefania judit judith lina maria uxue carolina vanessa marlene miriam silvia josefa beatriz montserrat susana sonia mireia julia olga elena'.split(' '));
// Clave torneo:equipo:oid. true incluye; false excluye. No usar apellidos.
const overrides = {};
function normalize(name){return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/^\d+\s+/, '');}
function includes(player,tournament){
 const key=[tournament,player.tpid,player.oid].join(':');
 if(Object.hasOwn(overrides,key))return overrides[key];
 const name=normalize(player.oname);
 return firstNames.has(name.split(/\s+/)[0]);
}
function filter(players,tournament,category){return category==='women'?players.filter(p=>includes(p,tournament)):players;}
function summary(players){
 const sum=key=>players.reduce((s,p)=>s+(Number(p[key])||0),0);
 const darts=sum('darts'),f9Darts=sum('f9Darts');
 return {count:players.length,teams:new Set(players.map(p=>p.tpid)).size,score:sum('score'),darts,avg:darts?sum('score')/darts*3:0,f9:f9Darts?sum('f9Score')/f9Darts*3:0,ton80:sum('ton80'),highOut:Math.max(0,...players.map(p=>p.highOut||0)),best:players.some(p=>p.best>0)?Math.min(...players.filter(p=>p.best>0).map(p=>p.best)):0};
}
function note(players,category){
 if(category!=='women')return '';
 return 'Identificación orientativa por el primer nombre; puede contener errores u omisiones. '+(players.length?'Se muestran '+players.length+' jugadoras con datos en esta selección.':'No se han identificado jugadoras con datos en esta selección; esto no confirma que no las haya.');
}
function headings(document,category){
 document.querySelectorAll('.card h2').forEach(h=>{
  for(const node of h.childNodes){
   if(node.nodeType!==3)continue;
   if(node.originalHeading===undefined)node.originalHeading=node.textContent;
   node.textContent=category==='women'?node.originalHeading.replace(/Jugadores/g,'Jugadoras').replace(/jugadores/g,'jugadoras').replace(/jugador/g,'jugadora'):node.originalHeading;
  }
 });
}
function table(container,players){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const avg=p=>p.darts?p.score/p.darts*3:0;
 const fmt=n=>Number(n).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
 const rows=[...players].sort((a,b)=>avg(b)-avg(a)||String(a.oname).localeCompare(String(b.oname)));
 container.innerHTML=rows.length?'<table style="min-width:1000px"><thead><tr>'+['#','Jugadora','Equipo','PJ','Sets G/J','Legs G/J','Puntos','Dardos','Media 3D','First 9','180s','Mejor cierre','Mejor leg individual'].map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+rows.map((p,i)=>'<tr>'+[i+1,p.oname,p.teamName,p.match,p.winSet+'/'+p.set,p.winLeg+'/'+p.leg,p.score,p.darts,p.darts?fmt(avg(p)):'—',p.f9Darts?fmt(p.f9Score/p.f9Darts*3):'—',p.ton80,p.highOut||'—',p.best||'—'].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<p>Sin jugadoras identificadas con datos en esta modalidad.</p>';
}
root.N01Women={includes,filter,summary,note,headings,table,overrides};
if(typeof module!=='undefined')module.exports=root.N01Women;
})(globalThis);
