import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||new URL('../package.json',import.meta.url));const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await page.waitForSelector('#loading[hidden]',{state:'attached'});
for(const id of ['export','import','settings','new-claim','demo-admin','world-dialog','mode-badge'])assert.equal(await page.locator('#'+id).count(),0);
assert.equal(await page.locator('footer').count(),0);assert.doesNotMatch(await page.locator('body').innerText(),/Demo|exportieren|importieren|Die Farbe zeigt/i);
await page.locator('#map').click({position:{x:300,y:250}});await page.fill('#owner','Tester');await page.click('#claim-form button');await page.waitForFunction(()=>document.querySelector('#claim-error').textContent.includes('nicht eingerichtet'));assert.equal(await page.locator('.claim-card').count(),0);
await page.click('#cancel-select');await page.click('#account');assert.equal(await page.inputValue('#login-name'),'totalhs');await page.fill('#password','test-only');await page.click('#auth-form button');await page.waitForFunction(()=>document.querySelector('#auth-error').textContent.includes('nicht eingerichtet'));assert.equal(await page.locator('#add-player').isVisible(),false);
await page.locator('#auth-dialog [data-close]').click();await page.waitForTimeout(1000);await page.screenshot({path:'../chunk-atlas-release-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'../chunk-atlas-release-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
console.log('PASS release UI: removed controls absent, map-click reservation, no false offline writes/admin access, totalhs login, desktop/mobile, no JS errors.');
}finally{await browser.close();}
