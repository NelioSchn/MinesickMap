import {chunkAt,plotAt,plotFromChunk,plotStyle,validateProject,seedValue,worldKey,LIMIT} from './core.js';
import * as backend from './backend.js';
const $=id=>document.getElementById(id), canvas=$('map'),ctx=canvas.getContext('2d');
let admin=false,selectedId=null,world,versions=[],epoch=0,ready=false,busy=false,filter='all',width=0,height=0,dpr=1;
let view={x:0,z:0,zoom:.55},grid=true,selection=null,anchor=null,selecting=false,drag=null,frame=0;
const tiles=new Map();let queue=[],needed=new Set(),toastTimer,syncTimer,refreshing=false;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
function renderSoon(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);renderSoon();}
new ResizeObserver(resize).observe(canvas);
function point(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function toWorld(p){return {x:view.x+(p.x-width/2)/view.zoom,z:view.z+(p.y-height/2)/view.zoom};}
function screen(x,z){return {x:(x-view.x)*view.zoom+width/2,y:(z-view.z)*view.zoom+height/2};}
function clampView(){view.x=Math.max(-LIMIT,Math.min(LIMIT,view.x));view.z=Math.max(-LIMIT,Math.min(LIMIT,view.z));}
function zoom(factor,p={x:width/2,y:height/2}){const before=toWorld(p);view.zoom=Math.max(.045,Math.min(12,view.zoom*factor));const after=toWorld(p);view.x+=before.x-after.x;view.z+=before.z-after.z;clampView();renderSoon();}
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
worker.onerror=()=>{ready=false;$('loading').hidden=false;$('loading').textContent='Kartengenerator konnte nicht starten. Bitte über HTTP / GitHub Pages öffnen.';};
worker.onmessage=({data:d})=>{
  if(d.epoch!==epoch)return;
  if(d.type==='error'){ready=false;busy=false;$('loading').hidden=false;$('loading').textContent=d.message;return;}
  if(d.type==='ready'){ready=true;busy=false;versions=d.versions;$('loading').hidden=true;renderSoon();return;}
  if(d.type==='tile'){
    const tile=document.createElement('canvas');tile.width=128;tile.height=128;tile.getContext('2d').putImageData(new ImageData(d.rgba,128,128),0,0);tiles.set(d.key,tile);
    if(tiles.size>220){for(const key of tiles.keys())if(!needed.has(key)){tiles.delete(key);if(tiles.size<=180)break;}}
    busy=false;renderSoon();
  }
};
function openWorld(w){world=w;epoch++;ready=false;busy=false;tiles.clear();queue=[];selection=null;anchor=null;closeSelection();$('loading').hidden=false;$('loading').textContent='Die Welt wird berechnet …';worker.postMessage({type:'init',world,epoch});
  $('edition-label').textContent='Java '+world.version;$('seed-label').textContent='SEED '+world.seed;$('seed-label').title=world.seed;$('map-version').textContent='JAVA '+world.version;
  $('version-note').hidden=true;renderList();renderSoon();
}
function draw(){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#253e3d';ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
  if(!world)return;
  const scale=view.zoom>=2?1:view.zoom>=.2?4:view.zoom>=.065?16:64,size=128*scale;
  const left=view.x-width/(2*view.zoom),top=view.z-height/(2*view.zoom),right=view.x+width/(2*view.zoom),bottom=view.z+height/(2*view.zoom);
  needed=new Set();queue=[];
  for(let z=Math.floor(top/size)*size;z<bottom;z+=size)for(let x=Math.floor(left/size)*size;x<right;x+=size){
    if(Math.abs(x)>LIMIT+size||Math.abs(z)>LIMIT+size)continue;
    const key=`${scale}:${x}:${z}`;needed.add(key);const p=screen(x,z),tile=tiles.get(key);
    if(tile)ctx.drawImage(tile,p.x,p.y,size*view.zoom+.5,size*view.zoom+.5);
    else{ctx.fillStyle=((x/size+z/size)%2)?'#294443':'#2b4745';ctx.fillRect(p.x,p.y,size*view.zoom+.5,size*view.zoom+.5);queue.push({type:'tile',key,x,z,scale,epoch});}
  }
  queue.sort((a,b)=>Math.hypot(a.x+size/2-view.x,a.z+size/2-view.z)-Math.hypot(b.x+size/2-view.x,b.z+size/2-view.z));
  if(ready&&!busy&&queue.length){busy=true;worker.postMessage(queue.shift());}
  // A restrained cartographic wash keeps claim boundaries legible.
  ctx.fillStyle='#173c301f';ctx.fillRect(0,0,width,height);
  if(grid&&view.zoom*32>=7){ctx.strokeStyle=view.zoom*32>24?'#ecf3de33':'#ecf3de18';ctx.lineWidth=1;ctx.beginPath();for(let x=Math.floor(left/32)*32;x<right;x+=32){const p=screen(x,0);ctx.moveTo(Math.round(p.x)+.5,0);ctx.lineTo(Math.round(p.x)+.5,height);}for(let z=Math.floor(top/32)*32;z<bottom;z+=32){const p=screen(0,z);ctx.moveTo(0,Math.round(p.y)+.5);ctx.lineTo(width,Math.round(p.y)+.5);}ctx.stroke();}
  for(const c of world.claims)drawClaim(plotStyle(c,world.players));
  const origin=screen(0,0);ctx.strokeStyle='#fff9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(origin.x-8,origin.y);ctx.lineTo(origin.x+8,origin.y);ctx.moveTo(origin.x,origin.y-8);ctx.lineTo(origin.x,origin.y+8);ctx.stroke();
  if(selection)drawClaim({...selection,color:'#f6e6af',name:'Auswahl',type:'selection'});
  const ruler=document.querySelector('.scale i');const rulerPx=width<500?65:100;const blocks=Math.pow(2,Math.round(Math.log2(rulerPx/view.zoom)));ruler.style.width=(blocks*view.zoom)+'px';$('scale-text').textContent=blocks+' Blöcke';
}
function drawClaim(c){const p=screen(c.x*16,c.z*16),w=c.w*16*view.zoom,h=c.h*16*view.zoom;if(p.x>width||p.y>height||p.x+w<0||p.y+h<0)return;ctx.fillStyle=c.color+(c.type==='selection'?'55':'44');ctx.fillRect(p.x,p.y,w,h);ctx.strokeStyle=c.color;ctx.lineWidth=c.type==='selection'?2:2.5;ctx.setLineDash(['selection','reserved'].includes(c.type)?[5,4]:[]);ctx.strokeRect(p.x,p.y,w,h);ctx.setLineDash([]);if(w>65&&h>26){ctx.save();ctx.beginPath();ctx.rect(p.x+4,p.y+3,w-8,h-6);ctx.clip();ctx.font='600 11px Segoe UI';const label=(c.type==='reserved'?'◷ ':'')+c.name;const tw=ctx.measureText(label).width;ctx.fillStyle='#12372ce6';ctx.fillRect(p.x+7,p.y+7,tw+16,23);ctx.fillStyle='#fff';ctx.fillText(label,p.x+15,p.y+23);ctx.restore();}}
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),point(e));},{passive:false});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);const p=point(e);drag={id:e.pointerId,start:p,last:p,moved:false};});
canvas.addEventListener('pointermove',e=>{const p=point(e),w=toWorld(p),c=chunkAt(w.x,w.z);$('hover-coord').textContent=`X ${Math.floor(w.x)} · Z ${Math.floor(w.z)} / Chunk ${c.join(', ')}`;if(drag&&drag.id===e.pointerId){if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>4)drag.moved=true;if(drag.moved){view.x-=(p.x-drag.last.x)/view.zoom;view.z-=(p.y-drag.last.y)/view.zoom;clampView();renderSoon();}drag.last=p;}});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved){const p=toWorld(point(e));showPlot(plotAt(p.x,p.z));}drag=null;});
canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('keydown',e=>{const move=80/view.zoom;if(e.key==='ArrowLeft')view.x-=move;else if(e.key==='ArrowRight')view.x+=move;else if(e.key==='ArrowUp')view.z-=move;else if(e.key==='ArrowDown')view.z+=move;else if(e.key==='+'||e.key==='=')zoom(1.4);else if(e.key==='-')zoom(1/1.4);else if(e.key==='Escape')closeSelection();else return;e.preventDefault();clampView();renderSoon();});
$('zoom-in').onclick=()=>zoom(1.5);$('zoom-out').onclick=()=>zoom(1/1.5);$('origin').onclick=()=>{view.x=0;view.z=0;renderSoon();};$('grid').onclick=()=>{grid=!grid;$('grid').classList.toggle('selected',grid);$('grid').setAttribute('aria-pressed',grid);renderSoon();};
$('jump').onsubmit=e=>{e.preventDefault();view.x=Number($('jump-x').value);view.z=Number($('jump-z').value);clampView();renderSoon();};
function syncSelection(){if(!selection)return;$('cx').value=selection.x;$('cz').value=selection.z;renderSoon();}
function closeSelection(){selection=null;selectedId=null;selecting=false;$('selection').hidden=true;canvas.classList.remove('selecting');renderSoon();}
function showPlot(plot){selection=plot;selecting=true;syncSelection();$('selection').hidden=false;canvas.classList.add('selecting');$('claim-error').textContent='';$('assign-error').textContent='';updatePlotPanel();}
function updatePlotPanel(){
 if(!selection||!world)return;
 const c=world.claims.find(c=>c.x===selection.x&&c.z===selection.z);selectedId=c?.id||null;
 $('claim-form').hidden=!!c;$('plot-detail').hidden=!c;$('plot-heading').textContent=c?(c.status==='reserved'?'Reservierter Plot':'Zugewiesener Plot'):'Plot reservieren';
 $('selection-hint').textContent=`Chunk ${selection.x}, ${selection.z} · 2 × 2 Chunks · Block ${selection.x*16}, ${selection.z*16}`;
 if(c){const player=world.players.find(p=>p.id===c.player_id);$('plot-summary').textContent=player?'Zugewiesen an '+player.name:'Wartet auf die Zuweisung durch den Admin.';$('plot-summary').style.borderLeftColor=player?.color||'#c69b53';$('plot-request').textContent='Reserviert von: '+c.requested_by;$('assign-form').hidden=!admin;$('admin-plot-actions').hidden=!admin;$('unassign').hidden=c.status!=='assigned';const select=$('assign-player');select.replaceChildren(new Option('Spieler auswählen …',''),...world.players.map(p=>new Option(p.name,p.id)));select.value=c.player_id||'';$('assign-form').querySelector('button').disabled=!world.players.length;if(admin&&!world.players.length)$('assign-error').textContent='Zuerst in der Spielerliste einen Spieler mit Farbe anlegen.';}
}
$('cancel-select').onclick=closeSelection;
for(const id of ['cx','cz'])$(id).addEventListener('change',()=>{const x=Number($('cx').value),z=Number($('cz').value);if(!Number.isFinite(x)||!Number.isFinite(z))return;showPlot(plotFromChunk(x,z));});
$('claim-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{
 const c={id:crypto.randomUUID(),x:Number($('cx').value),z:Number($('cz').value),requested_by:$('owner').value.trim(),status:'reserved',player_id:null};
 if(world.claims.some(p=>p.x===c.x&&p.z===c.z))throw new Error('Dieser Plot ist bereits reserviert oder zugewiesen.');
 const next=validateProject({...world,claims:[...world.claims,c]});
 await backend.reserve(c);await refreshData(true);
 renderList();updatePlotPanel();renderSoon();toast('Plot reserviert. Der Admin übernimmt die Zuweisung.');
 }catch(err){$('claim-error').textContent=err.message;}finally{button.disabled=false;}};
function requireAdmin(){if(!admin)throw new Error('Bitte zuerst als Admin anmelden.');}
$('assign-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{requireAdmin();const id=selectedId,player=$('assign-player').value;if(!player)throw new Error('Bitte einen Spieler wählen.');await backend.assign(id,player);await refreshData(true);renderList();updatePlotPanel();renderSoon();toast('Grundstück zugewiesen und in Spielerfarbe markiert.');}catch(err){$('assign-error').textContent=err.message;}finally{b.disabled=false;}};
$('unassign').onclick=async()=>{try{requireAdmin();await backend.assign(selectedId,null);await refreshData(true);renderList();updatePlotPanel();renderSoon();toast('Zuweisung aufgehoben. Die Reservierung bleibt bestehen.');}catch(err){toast(err.message);}};
$('release').onclick=async()=>{if(!confirm('Diesen Plot vollständig freigeben? Die Reservierung wird entfernt.'))return;try{requireAdmin();await backend.release(selectedId);await refreshData(true);renderList();updatePlotPanel();renderSoon();toast('Plot ist wieder frei.');}catch(err){toast(err.message);}};
function focusPlot(c){view.x=c.x*16+16;view.z=c.z*16+16;view.zoom=Math.max(view.zoom,3);clampView();showPlot({...c,w:2,h:2});renderSoon();}
function renderList(){if(!world)return;
 $('count').textContent=world.claims.length;const list=$('claim-list');list.replaceChildren();const query=$('search').value.toLocaleLowerCase();
 const claims=world.claims.filter(c=>(filter==='all'||c.status===filter)&&`${c.requested_by} ${world.players.find(p=>p.id===c.player_id)?.name||''} ${c.x} ${c.z}`.toLocaleLowerCase().includes(query));
 if(!claims.length){const div=document.createElement('div');div.className='empty';div.innerHTML='<span class="symbol">⌖</span><strong></strong><p></p>';div.querySelector('strong').textContent=world.claims.length?'Keine passenden Grundstücke':'Dein erster Plot wartet';div.querySelector('p').textContent=world.claims.length?'Name oder Filter ändern.':'Freien Plot auf der Karte anklicken und mit deinem Namen reservieren.';list.append(div);}
 for(const c of claims){const style=plotStyle(c,world.players);const card=document.createElement('article');card.className='claim-card '+c.status;card.style.setProperty('--claim-color',style.color);const b=document.createElement('button');b.className='focus-claim';b.textContent=`Plot ${c.x/2}, ${c.z/2}`;b.onclick=()=>focusPlot(c);const owner=document.createElement('small');owner.textContent=c.status==='assigned'?style.owner+' · Zugewiesen':c.requested_by+' · Reserviert';const meta=document.createElement('div');meta.className='claim-meta';meta.textContent=`4 Chunks · ${c.x}, ${c.z}`;card.append(b,owner,meta);list.append(card);}
 renderPlayers();
}
function renderPlayers(){const list=$('player-list');list.replaceChildren();$('add-player').hidden=!admin;if(!world.players.length){const p=document.createElement('p');p.className='players-intro';p.textContent='Noch keine Spieler eingetragen.';list.append(p);}
 for(const p of world.players){const row=document.createElement('div');row.className='player-row';const swatch=document.createElement('span');swatch.className='player-swatch';swatch.style.background=p.color;const b=document.createElement('button');b.className='player-name';b.textContent=p.name;b.onclick=()=>{$('search').value=p.name;filter='assigned';document.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('active',el.dataset.filter===filter));renderList();};const count=document.createElement('span');count.className='player-count';count.textContent=world.claims.filter(c=>c.player_id===p.id).length+' Plots';row.append(swatch,b,count);if(admin){const edit=document.createElement('button');edit.className='edit-player';edit.textContent='✎';edit.setAttribute('aria-label',p.name+' bearbeiten');edit.onclick=()=>editPlayer(p);row.append(edit);}list.append(row);}
}
function editPlayer(p){if(!admin)return;$('player-id').value=p?.id||'';$('player-name').value=p?.name||'';$('player-color').value=p?.color||nextColor();$('player-heading').textContent=p?'Spieler bearbeiten':'Spieler anlegen';$('player-error').textContent='';$('player-dialog').showModal();}
function nextColor(){return ['#80b4df','#d98eab','#91b56b','#dba25b','#a79bd2','#64b7ad'].find(c=>!world.players.some(p=>p.color===c))||'#a0a0a0';}
$('add-player').onclick=()=>editPlayer();
$('player-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{requireAdmin();const p={id:$('player-id').value||crypto.randomUUID(),name:$('player-name').value.trim(),color:$('player-color').value};const exists=world.players.some(old=>old.id===p.id);const next=validateProject({...world,players:exists?world.players.map(old=>old.id===p.id?p:old):[...world.players,p]});await backend.savePlayer({...p,id:exists?p.id:null});await refreshData(true);renderList();updatePlotPanel();renderSoon();$('player-dialog').close();toast('Spielerliste und Grundstücksfarben aktualisiert.');}catch(err){$('player-error').textContent=err.message;}finally{b.disabled=false;}};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('active',el===b));renderList();});$('search').oninput=renderList;
$('help').onclick=()=>$('help-dialog').showModal();$('map-tab').onclick=()=>canvas.focus();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
let refreshPromise;
function refreshData(afterWrite=false){if(refreshPromise)return afterWrite?refreshPromise.catch(()=>{}).then(()=>refreshData()):refreshPromise;refreshPromise=(async()=>{try{const next=validateProject(await backend.getSnapshot());admin=await backend.adminStatus().catch(()=>false);if(worldKey(next)!==worldKey(world))openWorld(next);else{world=next;renderList();updatePlotPanel();renderSoon();}updateAuth();}catch(err){toast('Verbindung unterbrochen. Bitte später erneut versuchen.');throw err;}})().finally(()=>refreshPromise=null);return refreshPromise;}
function updateAuth(){$('account').textContent=admin?'Admin aktiv':'Admin-Login';$('auth-state').textContent=admin?'Als Admin angemeldet.':'';$('logout').hidden=!admin;$('auth-fields').hidden=admin;if(world){renderPlayers();updatePlotPanel();}}
$('account').onclick=()=>{updateAuth();$('auth-error').textContent='';$('auth-dialog').showModal();};
$('auth-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await backend.signIn($('login-name').value,$('password').value);admin=true;$('password').value='';updateAuth();$('auth-dialog').close();renderList();toast('Admin angemeldet. Reservierte Plots können jetzt zugewiesen werden.');}catch(err){$('auth-error').textContent=err.message;}finally{b.disabled=false;}};
$('logout').onclick=async()=>{try{if(backend.online)await backend.signOut();}catch(err){toast(err.message);}admin=false;updateAuth();$('auth-dialog').close();renderList();};
async function start(){try{let w;if(backend.online){w=validateProject(await backend.getSnapshot());admin=await backend.adminStatus().catch(()=>false);syncTimer=setInterval(()=>{if(!document.hidden)refreshData().catch(()=>{});},8000);}else{const response=await fetch('./world.json');if(!response.ok)throw new Error('Karte nicht verfügbar.');w=validateProject(await response.json());}openWorld(w);updateAuth();}catch(err){$('loading').textContent=backend.configError?.() || 'Die Karte konnte nicht geladen werden. Bitte später erneut versuchen.';$('loading').hidden=false;console.error(err);}}
start();

