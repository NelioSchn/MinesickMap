export const LIMIT = 29999000;
export function seedValue(value) {
  const text = String(value).trim();
  if (!text || text.length > 128) throw new Error('Bitte einen Seed mit 1–128 Zeichen eingeben.');
  if (/^[+-]?\d+$/.test(text)) {
    const n = BigInt(text);
    if (n < -(1n << 63n) || n >= (1n << 63n)) throw new Error('Der Seed muss eine vorzeichenbehaftete 64-Bit-Zahl sein.');
    return n.toString();
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
  return String(hash);
}
export const chunkAt = (x,z) => [Math.floor(x/16),Math.floor(z/16)];
export const plotAt = (x,z) => ({x:Math.floor(x/32)*2,z:Math.floor(z/32)*2,w:2,h:2});
export const plotFromChunk = (x,z) => plotAt(x*16,z*16);
export function plotStyle(c,players){const p=players.find(p=>p.id===c.player_id);return {...c,w:2,h:2,name:p?.name||c.requested_by,owner:p?.name||c.requested_by,color:p?.color||'#c69b53',type:c.status==='reserved'?'reserved':'assigned'};}
export const worldKey = w => `${w.version}:${seedValue(w.seed)}`;
export function intersects(a,b) { return a.x<=b.x+b.w-1 && a.x+a.w-1>=b.x && a.z<=b.z+b.h-1 && a.z+a.h-1>=b.z; }
export function rectangle(a,b) { return {x:Math.min(a[0],b[0]),z:Math.min(a[1],b[1]),w:Math.abs(a[0]-b[0])+1,h:Math.abs(a[1]-b[1])+1}; }
export function validateWorld(raw) {
  if(raw?.schema===2)return validateProject(raw);
  if (!raw || raw.schema!==1 || typeof raw.name!=='string' || !raw.name.trim() || raw.name.length>60 || typeof raw.version!=='string' || raw.version.length>24 || typeof raw.seed!=='string' || !Array.isArray(raw.claims) || raw.claims.length>2000) throw new Error('Ungültige Projektdatei.');
  const seed = seedValue(raw.seed), ids = new Set(), claims=[];
  for (const c of raw.claims) {
    if (!c || typeof c.id!=='string' || c.id.length>80 || ids.has(c.id) || typeof c.name!=='string' || !c.name.trim() || c.name.length>60 || typeof c.owner!=='string' || !c.owner.trim() || c.owner.length>40 || !/^#[0-9a-f]{6}$/i.test(c.color) || !['claim','safe'].includes(c.type) || !['x','z','w','h'].every(k=>Number.isSafeInteger(c[k])) || c.w<1 || c.h<1 || c.w*c.h>65536 || Math.abs(c.x*16)>LIMIT || Math.abs(c.z*16)>LIMIT || Math.abs((c.x+c.w)*16)>LIMIT || Math.abs((c.z+c.h)*16)>LIMIT) throw new Error('Die Datei enthält ungültige Claims.');
    if (claims.some(old=>intersects(old,c))) throw new Error('Die Datei enthält überlappende Claims.');
    ids.add(c.id); claims.push({id:c.id,name:c.name,owner:c.owner,color:c.color,type:c.type,x:c.x,z:c.z,w:c.w,h:c.h});
  }
  return {schema:1,name:raw.name.trim(),seed,version:raw.version,example:raw.example===true,claims};
}
export function validateProject(raw){
  if(!raw||raw.schema!==2||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>60||typeof raw.version!=='string'||raw.version.length>24||typeof raw.seed!=='string'||!Array.isArray(raw.players)||raw.players.length>500||!Array.isArray(raw.claims)||raw.claims.length>2000)throw new Error('Ungültiges Plot-Projekt (Format 2 erwartet).');
  const players=[],ids=new Set(),names=new Set(),colors=new Set();
  for(const p of raw.players){if(!p||typeof p.id!=='string'||p.id.length>80||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>40||names.has(p.name.trim().toLowerCase())||!/^#[0-9a-f]{6}$/i.test(p.color)||colors.has(p.color.toLowerCase()))throw new Error('Spieler brauchen eindeutige Namen und Farben.');ids.add(p.id);names.add(p.name.trim().toLowerCase());colors.add(p.color.toLowerCase());players.push({id:p.id,name:p.name.trim(),color:p.color.toLowerCase()});}
  const positions=new Set(),claimIds=new Set(),claims=[];
  for(const c of raw.claims){if(!c||typeof c.id!=='string'||c.id.length>80||claimIds.has(c.id)||!Number.isSafeInteger(c.x)||!Number.isSafeInteger(c.z)||c.x%2||c.z%2||Math.abs(c.x*16)>LIMIT||Math.abs(c.z*16)>LIMIT||Math.abs((c.x+2)*16)>LIMIT||Math.abs((c.z+2)*16)>LIMIT||positions.has(`${c.x},${c.z}`)||typeof c.requested_by!=='string'||!c.requested_by.trim()||c.requested_by.length>40||!['reserved','assigned'].includes(c.status)||(c.status==='reserved'?c.player_id!==null:!ids.has(c.player_id)))throw new Error('Ungültiger Plot: 2 × 2 Chunks, eindeutige Position und gültige Zuweisung erforderlich.');positions.add(`${c.x},${c.z}`);claimIds.add(c.id);claims.push({id:c.id,x:c.x,z:c.z,requested_by:c.requested_by.trim(),status:c.status,player_id:c.player_id});}
  return {schema:2,name:raw.name.trim(),seed:seedValue(raw.seed),version:raw.version,example:raw.example===true,players,claims};
}
