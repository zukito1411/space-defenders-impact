import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'ignore'})
let browser
try {
  for(let i=0;i<120;i++){try{if((await fetch('http://127.0.0.1:5173/scripts/presentation-fixture.html')).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']})
  await mkdir('presentation-review',{recursive:true})
  const cases=[
    {name:'portrait',width:393,height:852,landscape:false},
    {name:'landscape',width:844,height:390,landscape:true,model:'godGundam'},
    {name:'portrait-compact',width:360,height:640,landscape:false,model:'godGundam'},
    {name:'landscape-compact',width:640,height:320,landscape:true,model:'spiegel'},
    {name:'reduced-motion',width:393,height:852,landscape:false,reduced:true},
  ]
  for(const item of cases){
    const {name,width,height,landscape,reduced=false}=item
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference',recordVideo:{dir:'presentation-review',size:{width,height}}})
    await context.addInitScript(value=>localStorage.setItem('raid-flight-view',value?'landscape':'vertical'),landscape)
    const page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto('http://127.0.0.1:5173/scripts/presentation-fixture.html'+(item.model?'?model='+item.model:''))
    if(name==='landscape'){
      await page.locator('.raid__menu-button--difficulty').click({timeout:120000})
      await page.locator('.space-door--idle').waitFor({state:'attached'})
      await page.locator('.raid__difficulty-card--expert').click()
      await page.locator('.raid__panel--difficulty .raid__start[data-dialog-dismiss]').click()
      await page.locator('.raid__panel--difficulty').waitFor({state:'hidden'})
      await page.locator('.space-door--idle').waitFor({state:'attached'})
    }
    await page.locator('button.raid__start').first().click({timeout:120000})
    await page.locator('.raid__carrier-briefing').waitFor({timeout:30000})
    await page.waitForTimeout(1200)
    const deck=page.locator('.raid__carrier-deck')
    await page.waitForFunction(()=>Number(document.querySelector('.raid__carrier-deck')?.getAttribute('data-canopy-open'))>.98,{},{timeout:20000})
    assert.equal(await deck.getAttribute('data-dock-clamp-renderer'),'atlas','docking clamps must use the supplied atlas')
    assert.equal(await deck.getAttribute('data-dock-clamp-loaded'),'true','docking clamp atlas must load')
    assert.equal(await deck.getAttribute('data-crew-atlas-loaded'), 'true', 'textured pilot and marshal must load')
    assert.equal(await deck.getAttribute('data-deck-services'), 'true', 'textured deck service crew must load')
    assert.equal(await deck.getAttribute('data-dock-clamp-release'),'0','clamps grip the vehicle during briefing')
    assert.equal(await deck.getAttribute('data-ladder-extension'),'1','boarding ladder must be deployed')
    await page.screenshot({path:`presentation-review/${name}-docked.png`})
    if(item.model)assert.equal(await page.locator('.raid__fx-canvas').getAttribute('data-mech-dock-frame'),'1','Gundam must hold the reference crouch on the deck')
    const angle=await deck.getAttribute('data-fan-angle')
    if(reduced){
      await page.waitForTimeout(500)
      assert.equal(await deck.getAttribute('data-fan-angle'),angle,`${name}: reduced motion freezes fans`)
    }else{
      await page.waitForFunction(previous=>document.querySelector('.raid__carrier-deck')?.getAttribute('data-fan-angle')!==previous,angle,{timeout:15000})
    }
    assert.equal(await deck.getAttribute('data-pilot-state'),'waiting')
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
    await page.waitForFunction(() => document.querySelector('.raid__carrier-hologram[data-channel=command] img')?.naturalWidth > 0)
    for(let beat=0;beat<4;beat++){
      const advance=page.locator('.raid__carrier-advance')
      if(beat>0)await advance.click()
      const paragraph=page.locator('.raid__carrier-comms p')
      const full=await paragraph.getAttribute('aria-label')
      if(await paragraph.innerText()!==full)await advance.click()
      assert.equal(await paragraph.innerText(),full,`${name}: full transmission is readable`)
      const reading=await page.locator('.raid__carrier-briefing').evaluate(el=>{
        const a=el.querySelector('.raid__carrier-mission').getBoundingClientRect(),b=el.querySelector('.raid__carrier-comms').getBoundingClientRect()
        return {overlap:a.bottom>b.top,overflow:el.scrollHeight>el.clientHeight}
      })
      assert.equal(reading.overlap,false,`${name}: full transmission overlaps mission`)
      assert.equal(reading.overflow,false,`${name}: full transmission scrolls`)
    }
    await page.screenshot({path:`presentation-review/${name}-clearance.png`})
    if(reduced)await page.waitForTimeout(1000)
    assert.equal(await page.locator('.raid__launch-ship').count(),0,'no duplicated ship layer')
    await page.locator('.raid__carrier-skip').click()
    await page.waitForFunction(()=>document.querySelector('.raid')?.dataset.carrierStage==='boarding',{},{timeout:30000})
    await page.waitForTimeout(700)
    await page.screenshot({path:`presentation-review/${name}-boarding.png`})
    console.log(name,'boarding')
    await page.waitForFunction(()=>document.querySelector('.raid')?.dataset.carrierStage==='clearing',{},{timeout:30000})
    await page.screenshot({path:`presentation-review/${name}-marshal.png`})
    await page.waitForFunction(()=>document.querySelector('.raid')?.dataset.carrierStage==='ignition',{},{timeout:30000})
    assert.equal(await page.locator('.raid__carrier-deck').getAttribute('data-pilot-state'),'aboard')
    assert.equal(await page.locator('.raid__carrier-deck').getAttribute('data-marshal-state'),'safe')
    assert.equal(await deck.getAttribute('data-cockpit-sealed'),'true','cockpit must seal before ignition')
    assert.equal(await deck.getAttribute('data-ladder-extension'),'0','ladder must retract before ignition')
    assert.ok(await page.locator('.space-door--idle').count(),'clearance to ignition must remain one continuous shot')
    await page.waitForTimeout(400)
    await page.screenshot({path:`presentation-review/${name}-ignition.png`})
    console.log(name,'ignition: pilot aboard, marshal safe')
    if(item.model)assert.equal(await page.locator('.raid__fx-canvas').getAttribute('data-mech-dock-frame'),'1','ignition must not change the crouch')
    await page.waitForFunction(()=>document.querySelector('.raid')?.dataset.carrierStage==='launch',{},{timeout:30000})
    assert.equal(await deck.getAttribute('data-dock-clamp-release'),'1','clamps must clear the vehicle before departure')
    if(!reduced){
      await page.waitForFunction(()=>Math.abs(parseFloat(document.querySelector('.raid').style.getPropertyValue('--carrier-shift-x')))+Math.abs(parseFloat(document.querySelector('.raid').style.getPropertyValue('--carrier-shift-y')))>100,{},{timeout:30000})
      if(item.model)assert.equal(await page.locator('.raid__fx-canvas').getAttribute('data-mech-dock-frame'),'1','departing through the bay must keep the crouch')
      await page.screenshot({path:`presentation-review/${name}-departure.png`})
      if(name==='landscape'){
        await page.locator('.raid__carrier-flight-status button').click()
        await page.locator('.raid__panel--pause .raid__start[data-dialog-dismiss]').waitFor()
        const fanBefore=await page.locator('.raid__carrier-deck').getAttribute('data-fan-angle')
        const before=await page.locator('.raid').evaluate(el=>[el.style.getPropertyValue('--carrier-shift-x'),el.style.getPropertyValue('--carrier-shift-y')])
        await page.waitForTimeout(900)
        const after=await page.locator('.raid').evaluate(el=>[el.style.getPropertyValue('--carrier-shift-x'),el.style.getPropertyValue('--carrier-shift-y')])
        assert.deepEqual(after,before,'pause must freeze carrier departure')
        assert.equal(await page.locator('.raid__carrier-deck').getAttribute('data-fan-angle'),fanBefore,'pause freezes deck fans and crew')
        await page.locator('.raid__panel--pause .raid__start[data-dialog-dismiss]').click()
      }
    }
    if(item.model&&!reduced){
      await page.waitForFunction(()=>document.querySelector('.raid__fx-canvas')?.getAttribute('data-mech-dock-frame')==='2',{},{timeout:30000})
      assert.equal(await page.locator('.raid').getAttribute('data-carrier-stage'),'clear','changing pose must happen outside the bay')
      assert.equal(await page.locator('.raid').evaluate(el=>Number(el.style.getPropertyValue('--raid-launch-opacity'))),0)
      await page.screenshot({path:`presentation-review/${name}-outside-pose-change.png`})
    }
    // Reduced motion cuts directly to space at departure, retaining the shared
    // simulation clock. SwiftShader needs a larger budget for that entire hold.
    await page.waitForFunction(()=>document.querySelector('.raid')?.dataset.carrierStage==='flight',{},{timeout:reduced?75000:45000})
    await page.waitForTimeout(1000)
    await page.screenshot({path:`presentation-review/${name}-flight.png`})
    if(item.model&&landscape){
      for(const stage of ['windup','charge','release','recover']){
        await page.waitForFunction(expected=>document.querySelector('.raid__fx-canvas')?.getAttribute('data-mech-action-stage')===expected,stage,{timeout:30000})
        assert.equal(await page.locator('.raid__fx-canvas').getAttribute('data-mech-action-model'),item.model)
        await page.screenshot({path:`presentation-review/${name}-attack-${stage}.png`})
      }
    }
    assert.deepEqual(errors,[])
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false)
    console.log(name,'passed')
    await context.close()
  }
  const recovery = await browser.newPage({ viewport: { width: 844, height: 390 } })
  try {
    await recovery.addInitScript(() => {
      localStorage.setItem('raid-flight-view', 'landscape')
      const play = HTMLMediaElement.prototype.play
      window.playedAudio = []
      HTMLMediaElement.prototype.play = function () {
        if (this instanceof HTMLAudioElement && this.src) window.playedAudio.push(new URL(this.src).pathname)
        return play.call(this)
      }
    })
    await recovery.goto('http://127.0.0.1:5173/scripts/presentation-fixture.html?mode=endless')
    await recovery.locator('button.raid__start').first().click({ timeout: 120000 })
    const briefing = recovery.locator('.raid__carrier-briefing')
    await briefing.locator('.raid__carrier-skip').click()
    const raid = recovery.locator('.raid')
    await recovery.waitForFunction(() => document.querySelector('.raid')?.getAttribute('data-carrier-stage') === 'approach', {}, { timeout: 75000 })
    await recovery.screenshot({ path: 'presentation-review/mesiah-recovery-approach.png' })
    await briefing.getByRole('heading', { name: 'Intercept Devil Gundam' }).waitFor({ timeout: 60000 })
    assert.equal(await raid.getAttribute('data-carrier-stage'), 'docked')
    assert.equal(await raid.locator('.raid__carrier-deck').getAttribute('data-dock-clamp-release'), '0')
    assert.equal(await briefing.locator('.raid__carrier-back').count(), 0)
    await recovery.waitForFunction(() => document.querySelector('.raid__carrier-hologram[data-channel=command] img')?.naturalWidth > 0)
    await recovery.screenshot({ path: 'presentation-review/mesiah-recovery-briefing.png' })
    const advance = briefing.locator('.raid__carrier-advance')
    const paragraph = briefing.locator('.raid__briefing-copy')
    const finishLine = async () => {
      const line = await paragraph.getAttribute('aria-label')
      await recovery.waitForFunction(expected => document.querySelector('.raid__briefing-copy')?.textContent === expected, line)
    }
    for (let beat = 0; beat < 2; beat++) {
      await finishLine()
      await advance.click()
    }
    await briefing.locator('.raid__carrier-hologram[data-channel=enemy] img').waitFor()
    await recovery.waitForFunction(() => document.querySelector('.raid__carrier-hologram img')?.naturalWidth > 0)
    assert.equal(await briefing.getAttribute('data-hostile'), 'true')
    assert.match(await paragraph.getAttribute('aria-label'), /I’ve been listening since you left the bay/)
    await finishLine()
    await recovery.screenshot({ path: 'presentation-review/mesiah-hostile-transmission.png' })
    await advance.click()
    assert.match(await paragraph.getAttribute('aria-label'), /This is our private channel/)
    assert.equal(await briefing.getAttribute('data-hostile'), 'true')
    await finishLine()
    await advance.click()
    assert.match(await paragraph.getAttribute('aria-label'), /how did they get in/)
    await finishLine()
    await advance.click()
    assert.match(await paragraph.getAttribute('aria-label'), /before you heard the distress call/)
    await finishLine()
    await advance.click()
    assert.equal(await briefing.locator('.raid__carrier-hologram[data-channel=command]').count(), 1)
    assert.match(await paragraph.getAttribute('aria-label'), /backup channel/)
    await finishLine()
    await advance.click()
    assert.match(await paragraph.getAttribute('aria-label'), /draw Devil Gundam away from the carrier/)
    await briefing.locator('.raid__carrier-skip').click()
    await recovery.locator('.raid__boss-warning').waitFor({ timeout: 75000 })
    assert.equal(await briefing.count(), 0)
    const playedAudio = await recovery.evaluate(() => window.playedAudio)
    for (const cue of ['flight-deck', 'hangar-bed', 'hostile-channel', 'thruster-heat', 'thruster-release']) {
      assert.ok(playedAudio.includes(`/audio/mesiah/${cue}.ogg`), `Mesiah sequence did not play ${cue}`)
    }
    await recovery.waitForFunction(() => window.playedAudio.includes('/audio/bgm_boss_final.wav'), {}, { timeout: 10000 })
    await recovery.waitForFunction(() => window.playedAudio.includes('/audio/boss/beam-charge.ogg') &&
      ['/audio/boss/beam-fire.ogg', '/audio/boss/creature-strike.ogg'].some(path => window.playedAudio.includes(path)), {}, { timeout: 45000 })
    console.log('Mesiah briefing switches between commander and enemy; Devil Gundam has its own battle music and timed attack sounds')
  } finally {
    await recovery.close()
  }
}finally{await browser?.close();server.kill()}
