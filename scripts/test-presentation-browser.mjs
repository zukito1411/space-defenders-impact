import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'ignore'})
let browser
try {
  for(let i=0;i<120;i++){try{if((await fetch('http://127.0.0.1:5173/scripts/presentation-fixture.html')).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
  browser=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']})
  await mkdir('presentation-review',{recursive:true})
  const cases=[
    {name:'portrait',width:393,height:852,landscape:false},
    {name:'landscape',width:844,height:390,landscape:true},
    {name:'portrait-compact',width:360,height:640,landscape:false},
    {name:'landscape-compact',width:640,height:320,landscape:true},
    {name:'reduced-motion',width:393,height:852,landscape:false,reduced:true},
  ]
  for(const item of cases){
    const {name,width,height,landscape,reduced=false}=item
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:'presentation-review',size:{width,height}}})
    await context.addInitScript(value=>localStorage.setItem('raid-flight-view',value?'landscape':'vertical'),landscape)
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto('http://127.0.0.1:5173/scripts/presentation-fixture.html')
    await page.locator('button.raid__start').first().click({timeout:120000})
    await page.locator('.raid__carrier-briefing').waitFor({timeout:30000})
    await page.waitForTimeout(1200)
    await page.screenshot({path:`presentation-review/${name}-docked.png`})
    assert.equal(await page.locator('.raid__carrier-goals > span').count(),3)
    assert.ok(await page.locator('.raid__fx-canvas').evaluate(canvas=>{
      const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data
      let count=0;for(let i=3;i<d.length;i+=4)if(d[i]>100)count++;return count>60
    }),'the docked player must actually render')
    const layout=await page.locator('.raid__carrier-briefing').evaluate(el=>{
      const mission=el.querySelector('.raid__carrier-mission').getBoundingClientRect(),comms=el.querySelector('.raid__carrier-comms').getBoundingClientRect()
      return {overlap:mission.bottom>comms.top,overflow:el.scrollWidth>el.clientWidth||el.scrollHeight>el.clientHeight,commsBottom:comms.bottom}
    })
    assert.equal(layout.overlap,false,`${name}: mission and comms overlap`)
    assert.equal(layout.overflow,false,`${name}: briefing overflow`)
    assert.ok(layout.commsBottom<=height,`${name}: actions below screen`)
    if(reduced)await page.waitForTimeout(3000)
    assert.equal(await page.locator('.raid__launch-ship').count(),0,'no duplicated ship layer')
    await page.locator('.raid__carrier-skip').click()
    await page.waitForFunction(()=>document.querySelector('.raid')?.dataset.carrierStage==='ignition',{},{timeout:30000})
    await page.screenshot({path:`presentation-review/${name}-ignition.png`})
    await page.waitForFunction(()=>document.querySelector('.raid')?.dataset.carrierStage==='launch',{},{timeout:30000})
    if(!reduced){
      await page.waitForFunction(()=>Math.abs(parseFloat(document.querySelector('.raid').style.getPropertyValue('--carrier-shift-x')))+Math.abs(parseFloat(document.querySelector('.raid').style.getPropertyValue('--carrier-shift-y')))>100,{},{timeout:30000})
      await page.screenshot({path:`presentation-review/${name}-departure.png`})
      if(name==='landscape'){
        await page.locator('.raid__carrier-flight-status button').click()
        await page.getByRole('button',{name:/resume/i}).waitFor()
        const before=await page.locator('.raid').evaluate(el=>[el.style.getPropertyValue('--carrier-shift-x'),el.style.getPropertyValue('--carrier-shift-y')])
        await page.waitForTimeout(900)
        const after=await page.locator('.raid').evaluate(el=>[el.style.getPropertyValue('--carrier-shift-x'),el.style.getPropertyValue('--carrier-shift-y')])
        assert.deepEqual(after,before,'pause must freeze carrier departure')
        await page.getByRole('button',{name:/resume/i}).click()
      }
    }
    await page.waitForFunction(()=>document.querySelector('.raid')?.dataset.carrierStage==='flight',{},{timeout:45000})
    await page.waitForTimeout(1000)
    await page.screenshot({path:`presentation-review/${name}-flight.png`})
    assert.deepEqual(errors,[])
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false)
    await context.close()
  }
}finally{await browser?.close();server.kill()}
