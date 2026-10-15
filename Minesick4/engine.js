import createModule from './vendor/seed_engine.js';
import {seedValue} from './core.js';
export async function createEngine() {
  const m=await createModule(); let version;
  const versions=[];
  for(let v=m._wasm_version_min();v<=m._wasm_version_max();v++) {
    const len=m._wasm_mc_name_length(v);
    if(len>0){const label=m.UTF8ToString(m._wasm_mc_name_ptr(v),len); if(label && label!=='?' && !versions.some(e=>e.label===label)) versions.push({label,value:v});}
  }
  const p=m._malloc(768); m._wasm_biome_colors(p); const colors=Uint8Array.from(m.HEAPU8.subarray(p,p+768)); m._free(p);
  return {versions,colors,
    init(world){const v=versions.find(v=>v.label===world.version); if(!v)throw new Error(`Java ${world.version} wird von diesem Generator nicht unterstützt.`); version=v.value; const seed=BigInt(seedValue(world.seed)); if(m._wasm_init(version,0,Number(BigInt.asUintN(32,seed)),Number(BigInt.asUintN(32,seed>>32n))))throw new Error('Welt konnte nicht geladen werden.');},
    biome(x,z){return m._wasm_get_biome(1,x,64,z);},
    name(id){const n=m._wasm_biome_name_length(version,id);return n>0?m.UTF8ToString(m._wasm_biome_name_ptr(version,id),n):'unknown';},
    tile(x,z,scale,size=128){const ptr=m._malloc(size*size*4); if(!ptr)throw new Error('Nicht genug Speicher.');try{const rc=m._wasm_generate_biomes(x/scale,z/scale,size,size,scale,scale===1?64:16,ptr);if(rc)throw new Error('Kartengenerierung fehlgeschlagen.');return Int32Array.from(m.HEAP32.subarray(ptr/4,ptr/4+size*size));}finally{m._free(ptr);}}
  };
}


