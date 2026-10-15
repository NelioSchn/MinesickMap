import {config} from './config.js';
export const online = Boolean(config.supabaseUrl && config.supabaseKey);
const sessionKey='chunk-atlas-session:'+config.supabaseUrl;
let session=null,refreshing=null;
try{session=JSON.parse(localStorage.getItem(sessionKey)||'null');}catch{}
function store(value){session=value;try{value?localStorage.setItem(sessionKey,JSON.stringify(value)):localStorage.removeItem(sessionKey);}catch{}}
export const user=()=>session?.user;
export async function acceptConfirmation(){
  const params=new URLSearchParams(location.hash.slice(1));
  if(!params.has('access_token')&&!params.has('error_description'))return;
  history.replaceState(null,'',location.pathname+location.search);
  if(params.has('error_description'))throw new Error(params.get('error_description'));
  const token=params.get('access_token'),refresh=params.get('refresh_token');
  if(!refresh)throw new Error('Bitte mit E-Mail und Passwort anmelden.');
  const account=await request('/auth/v1/user',{token});
  store({access_token:token,refresh_token:refresh,user:account,expires_at:Date.now()/1000+Number(params.get('expires_in')||3600)});
}
async function request(path,{method='GET',body,token}={}){
  if(config.supabaseKey?.startsWith('sb_secret_'))throw new Error('In config.js steht ein Secret Key. Bitte durch den öffentlichen Supabase Publishable Key ersetzen.');
  if(!online)throw new Error('Der Dienst ist noch nicht eingerichtet. Bitte später erneut versuchen.');
  const r=await fetch(config.supabaseUrl.replace(/\/$/,'')+path,{method,headers:{apikey:config.supabaseKey,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(data?.msg||data?.message||data?.error_description||`Verbindung fehlgeschlagen (${r.status}).`);
  return data;
}
async function access(){
  if(!session)throw new Error('Bitte zuerst anmelden.');
  if(!session.expires_at||session.expires_at<Date.now()/1000+60){
    refreshing??=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}}).then(s=>{store({...s,expires_at:Date.now()/1000+s.expires_in});}).catch(e=>{store(null);throw e;}).finally(()=>{refreshing=null;}); await refreshing;
  }
  return session.access_token;
}
export async function signIn(name,password){if(name.trim().toLowerCase()!==(config.adminUsername||'totalhs').toLowerCase())throw new Error('Name oder Passwort ist falsch.');const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:config.adminEmail,password}});store({...s,expires_at:Date.now()/1000+s.expires_in});if(!await adminStatus()){store(null);throw new Error('Dieses Konto hat keine Admin-Rechte für diese Welt.');}}
export async function signOut(){try{if(session)await request('/auth/v1/logout',{method:'POST',token:await access()});}finally{store(null);}}
async function rpc(name,args={},admin=false){return request('/rest/v1/rpc/'+name,{method:'POST',body:{p_world:config.worldId,...args},token:admin?await access():undefined});}
export async function adminStatus(){return session?await rpc('atlas_is_admin',{},true):false;}
export async function getSnapshot(){const data=await rpc('atlas_snapshot');if(!data)throw new Error('Welt fehlt. Bitte setup.sql ausführen.');return data;}
export const reserve=c=>rpc('atlas_reserve',{p_name:c.requested_by,p_x:c.x,p_z:c.z});
export const savePlayer=p=>rpc('atlas_save_player',{p_id:p.id||null,p_name:p.name,p_color:p.color},true);
export const assign=(plot,player)=>rpc('atlas_assign',{p_plot:plot,p_player:player||null},true);
export const release=plot=>rpc('atlas_release',{p_plot:plot},true);
export const configError=()=>config.supabaseKey?.startsWith('sb_secret_')?'In config.js steht ein Secret Key. Bitte durch den öffentlichen Supabase Publishable Key ersetzen.':null;
