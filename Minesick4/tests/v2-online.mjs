import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||new URL('../package.json',import.meta.url));const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
let claims=[],players=[],publicReservation=false;const errors=[];
async function setup(context){await context.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const config={supabaseUrl:'https://atlas-test.supabase.co',supabaseKey:'public-test',worldId:'main',adminUsername:'totalhs',adminEmail:'admin@chunk-atlas.invalid'}"}));await context.route('https://atlas-test.supabase.co/**',async route=>{
 const req=route.request(),path=new URL(req.url()).pathname,headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
 if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
 const p=req.postDataJSON()||{},auth=req.headers().authorization==='Bearer test-token';let data=null,status=200;
 if(path==='/auth/v1/token'){assert.equal(p.email,'admin@chunk-atlas.invalid');if(p.password!=='fixed-test-password'){status=400;data={message:'Name oder Passwort falsch'};}else data={access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,user:{id:'admin-user'}};}
 else if(path.endsWith('/atlas_is_admin'))data=auth;
 else if(path.endsWith('/atlas_snapshot'))data={schema:2,name:'Online-Welt',seed:'42',version:'1.21.11',example:true,claims,players};
 else if(path.endsWith('/atlas_reserve')){publicReservation=!req.headers().authorization;claims.push({id:'plot-1',x:p.p_x,z:p.p_z,requested_by:p.p_name,status:'reserved',player_id:null});data='plot-1';}
 else if(!auth&&path!=='/auth/v1/logout'){status=403;data={message:'Nur Admin'};}
 else if(path.endsWith('/atlas_save_player')){const player={id:p.p_id||'player-1',name:p.p_name,color:p.p_color};players=players.filter(v=>v.id!==player.id);players.push(player);data=player.id;}
 else if(path.endsWith('/atlas_assign')){claims=claims.map(c=>c.id===p.p_plot?{...c,player_id:p.p_player,status:p.p_player?'assigned':'reserved'}:c);}
 else if(path.endsWith('/atlas_release'))claims=[];
 await route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
 });}
try{
const adminContext=await browser.newContext(),visitorContext=await browser.newContext();await setup(adminContext);await setup(visitorContext);
const visitor=await visitorContext.newPage();visitor.on('pageerror',e=>errors.push(e.message));await visitor.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await visitor.waitForSelector('#loading[hidden]',{state:'attached'});await visitor.locator('#map').click({position:{x:300,y:250}});await visitor.fill('#owner','Alex');await visitor.click('#claim-form button');await visitor.waitForSelector('.claim-card');assert.equal(publicReservation,true);assert.equal(claims[0].status,'reserved');
const admin=await adminContext.newPage();admin.on('pageerror',e=>errors.push(e.message));await admin.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await admin.waitForSelector('.claim-card');await admin.click('#account');await admin.fill('#password','wrong');await admin.click('#auth-form button');await admin.waitForFunction(()=>document.querySelector('#auth-error').textContent.includes('falsch'));await admin.fill('#password','fixed-test-password');await admin.click('#auth-form button');await admin.waitForSelector('#auth-dialog',{state:'hidden'});
await admin.click('#add-player');await admin.fill('#player-name','Alex');await admin.click('#player-form button');await admin.click('.focus-claim');await admin.selectOption('#assign-player',{label:'Alex'});await admin.click('#assign-form button');await admin.waitForFunction(()=>document.querySelector('.claim-card').classList.contains('assigned'));
await visitor.waitForFunction(()=>document.querySelector('.claim-card')?.classList.contains('assigned'),{},{timeout:12000});assert.match(await visitor.locator('#player-list').innerText(),/Alex/);assert.equal(await visitor.locator('#assign-form').isVisible(),false);
await admin.click('#unassign');await admin.waitForFunction(()=>document.querySelector('.claim-card').classList.contains('reserved'));admin.on('dialog',d=>d.accept());await admin.click('#release');await admin.waitForFunction(()=>document.querySelectorAll('.claim-card').length===0);
assert.deepEqual(errors,[]);console.log('PASS mocked online v2: anonymous reservation, fixed-name/password login rejects bad password, admin player/assignment flow, independent public browser sees polling update and legend, unassign/release.');
}finally{await browser.close();}
