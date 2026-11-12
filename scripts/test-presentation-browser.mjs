import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'ignore'})
let browser
try {
  for(let i=0;i<120;i++) {try {if((await fetch('http://127.0.0.1:5173/scripts/presentation-fixture.html')).ok)break}catch{} await new Promise(r=>setTimeout(r,250))}
  browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']})
  await mkdir('presentation-review',{recursive:true})
  for(const landscape of [false,true]) {
    const context=await browser.newContext({viewport:landscape?{width:844,height:390}:{width:393,height:852},hasTouch:true,deviceScaleFactor:1,recordVideo:{dir:'presentation-review',size:landscape?{width:844,height:390}:{width:393,height:852}}})
    await context.addInitScript(value=>{localStorage.setItem('raid-flight-view',value?'landscape':'vertical')},landscape)
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto('http://127.0.0.1:5173/scripts/presentation-fixture.html')
    await page.locator('button.raid__start').first().click({timeout:120000})
    await page.locator('.raid__briefing-copy').waitFor({timeout:30000})
    await page.waitForTimeout(700)
    await page.keyboard.press('Enter')
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.raid__launch-sequence')).opacity)>.05,{},{timeout:120000})
    assert.equal(await page.locator('.raid__launch-ship').count(),0,'duplicate launch ship')
    assert.equal(await page.locator('.raid__launch-sequence img').count(),0,'backdrop must not draw a second ship')
    await page.waitForTimeout(250)
    await page.screenshot({path:`presentation-review/${landscape?'landscape':'portrait'}-launch.png`})
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.raid__launch-sequence')).opacity)===0,{},{timeout:30000})
    await page.waitForTimeout(2000)
    await page.screenshot({path:`presentation-review/${landscape?'landscape':'portrait'}-flight.png`})
    assert.deepEqual(errors,[])
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await context.close()
  }
} finally {await browser?.close();server.kill()}
