import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||new URL('../package.json',import.meta.url));const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://127.0.0.1:4173');await page.waitForSelector('#loading[hidden]',{state:'attached'});
await page.click('#new-claim');await page.fill('#cx','-2');await page.fill('#cz','-2');await page.fill('#owner','Nelio');await page.click('#claim-form button');await page.waitForSelector('.claim-card');
assert.match(await page.locator('.claim-card').innerText(),/4 Chunks/);assert.equal(await page.locator('#assign-form').isVisible(),false);
await page.reload();await page.waitForSelector('.claim-card');await page.click('.focus-claim');assert.match(await page.locator('#plot-heading').innerText(),/Reservierter/);
await page.click('#account');await page.click('#demo-admin');await page.click('#add-player');await page.fill('#player-name','Nelio');await page.fill('#player-color','#80b4df');await page.click('#player-form button');
await page.selectOption('#assign-player',{label:'Nelio'});await page.click('#assign-form button');assert.match(await page.locator('.claim-card').innerText(),/Zugewiesen/);assert.match(await page.locator('#player-list').innerText(),/1 Plots/);
await page.click('.edit-player');await page.fill('#player-color','#d98eab');await page.click('#player-form button');assert.match(await page.locator('.claim-card').getAttribute('style'),/#d98eab/);
await page.click('#cancel-select');await page.waitForTimeout(1000);await page.screenshot({path:'../chunk-atlas-v2-desktop.png',fullPage:true});
await page.click('#account');await page.click('#logout');assert.equal(await page.locator('#add-player').isVisible(),false);await page.click('.focus-claim');assert.equal(await page.locator('#assign-form').isVisible(),false);assert.match(await page.locator('#plot-summary').innerText(),/Nelio/);
await page.click('#cancel-select');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'../chunk-atlas-v2-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);console.log('PASS browser v2: public reservation, exact 4-chunk plot, persistence, admin demo, player creation, assignment, recolor propagation, logout hides admin controls, public legend, mobile layout.');
}finally{await browser.close();}
