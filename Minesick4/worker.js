import {createEngine} from './engine.js';
let engine;
// Cartographic palette; only the presentation changes, never the generated biome IDs.
const palette={0:'#386779',1:'#91a970',2:'#d5c58a',3:'#929b87',4:'#668351',5:'#567960',6:'#536d52',7:'#548b9c',10:'#799eaa',11:'#8fb1b4',12:'#d8dfcf',14:'#b3a0b0',16:'#d7cb9c',21:'#537d41',24:'#2f5366',25:'#929a85',26:'#c4cdb8',27:'#89a16a',29:'#455f43',30:'#a2b6a5',32:'#6b8461',35:'#b4b271',36:'#b3aa65',37:'#b4865d',38:'#a68b62',39:'#ad8e68',44:'#519c9d',45:'#4c8495',46:'#447587',47:'#447e8b',48:'#365d74',49:'#375768',50:'#64828e',127:'#91a970',129:'#a8bc7f',132:'#8b9a64',168:'#628b45',169:'#668b50',174:'#7d9577',175:'#a5b39c',177:'#acbd91',178:'#ced9c7',179:'#e0e5d8',180:'#a5b1a3',181:'#d6dfd5',182:'#a3a899',183:'#3d5958',184:'#617e61',185:'#c6a7b1',186:'#a6b3a0'};
const rgb=Object.fromEntries(Object.entries(palette).map(([id,c])=>[id,[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))]));
self.onmessage=async({data:d})=>{
  try {
    if(d.type==='init') {engine??=await createEngine();engine.init(d.world);self.postMessage({type:'ready',epoch:d.epoch,versions:engine.versions});return;}
    if(d.type==='tile') {
      const ids=engine.tile(d.x,d.z,d.scale),rgba=new Uint8ClampedArray(ids.length*4);
      for(let i=0;i<ids.length;i++){let b=ids[i]*3;const color=rgb[ids[i]]||[engine.colors[b],engine.colors[b+1],engine.colors[b+2]];rgba[i*4]=color[0];rgba[i*4+1]=color[1];rgba[i*4+2]=color[2];rgba[i*4+3]=255;}
      self.postMessage({...d,rgba},[rgba.buffer]);
    }
  } catch(error){self.postMessage({type:'error',epoch:d.epoch,message:error.message});}
};
