/* Navegación entre categorías conservando la liga seleccionada. */
(function(root){
 function update(id){
  if(!/^t_[A-Za-z0-9]+_[0-9]+$/.test(id||''))return;
  for(const [key,page] of [['nav-tournament','dashboard.html'],['nav-team','equipo.html'],['nav-women','jugadoras.html']]){
   const link=document.getElementById(key);
   if(link)link.href=page+'?id='+encodeURIComponent(id);
  }
 }
 root.N01Nav={update};
 update(new URLSearchParams(location.search).get('id'));
})(globalThis);
