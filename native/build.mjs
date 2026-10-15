// Optional: only needed to rebuild the already bundled WASM engine.
// Requires activated Emscripten 6.0.12, or EMCC_PY + PYTHON pointing at emcc.py and Python.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const sources=['finders','generator','layers','biomenoise','biomes','noise','util','quadbase'].map(n=>`native/cubiomes/${n}.c`);
sources.push('native/engine/src/seed_engine.c','native/engine/src/wasm_bindings.c');
const exports=['malloc','free','wasm_init','wasm_get_biome','wasm_generate_biomes','wasm_biome_name_length','wasm_biome_name_ptr','wasm_mc_name_length','wasm_mc_name_ptr','wasm_biome_colors','wasm_version_min','wasm_version_max'];
const args=[...sources,'-Inative/engine/include','-Inative/cubiomes','-O3','-fwrapv','-sWASM=1','-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=web,worker,node','-sALLOW_MEMORY_GROWTH=1',`-sEXPORTED_FUNCTIONS=${JSON.stringify(exports.map(n=>'_'+n))}`,'-sEXPORTED_RUNTIME_METHODS=[UTF8ToString,HEAP32,HEAPU8]','-o','vendor/seed_engine.js'];
const command=process.env.EMCC_PY?(process.env.PYTHON||'python'):(process.env.EMCC||'emcc');
const result=spawnSync(command,process.env.EMCC_PY?[process.env.EMCC_PY,...args]:args,{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
