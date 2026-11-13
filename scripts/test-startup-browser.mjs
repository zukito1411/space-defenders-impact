import assert from 'node:assert/strict'
import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {chromium} from 'playwright'

const logo=await readFile('public/assets/brand/zuki-logo-v1.png')
assert.equal(createHash('sha1').update(`blob ${logo.length}\0`).update(logo).digest('hex'),'9e99a440108247cf8cbf9a4b5d2e30a2371eae01','reuse the unmodified Tales logo')
const port=5179,base=`http://127.0.0.1:${port}`
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'})
const exited=once(server,'exit')
let browser
const gate=()=>{let open;const promise=new Promise(resolve=>{open=resolve});return{promise,open}}
async function captureStudioScreen(page,path){
 // The entry module or menu artwork is deliberately held here. FontFaceSet.ready waits for
 // document loading, so capture the already-painted native-font/logo surface.
 const session=await page.context().newCDPSession(page)
 try{const {data}=await session.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path,Buffer.from(data,'base64'))}
 finally{await session.detach()}
}
try{
 for(let i=0;i<120;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']})
 await mkdir('presentation-review',{recursive:true})
 for(const mode of['automatic','skip','failed-logo','failed-entry']){
  const context=await browser.newContext({viewport:mode==='skip'?{width:844,height:390}:{width:393,height:852},hasTouch:true,reducedMotion:mode==='failed-logo'?'reduce':'no-preference'})
  const entry=gate(),art=gate(),errors=[]
  if(mode!=='automatic')entry.open()
  if(mode==='failed-logo')art.open()
  try{
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url())
    // This is an opening/menu test: never send synthetic profiles or other traffic
    // to the live relay, and leave optional gameplay media out of the boot check.
    if(url.hostname!=='127.0.0.1')return route.abort()
    if(mode==='failed-entry'&&url.pathname==='/src/main.tsx')return route.abort()
    if(url.pathname==='/src/main.tsx')await entry.promise
    if(/\/assets\/ui\/(orbital-hangar-v1|console-plate-v1)\.png$/.test(url.pathname))await art.promise
    if(mode==='failed-logo'&&url.pathname.endsWith('/zuki-logo-v1.png'))return route.abort()
    if(/\/(audio|assets\/(ships|aliens|others|raid-fx))\//.test(url.pathname))return route.abort()
    return route.continue()
   })
   await page.goto(base,{waitUntil:'commit'})
   if(mode==='failed-entry'){
    await page.getByRole('button',{name:'Retry opening'}).waitFor({timeout:10000})
    assert.equal(await page.locator('#startup-splash').count(),1)
    assert.equal(await page.locator('.start-screen').count(),0)
    console.log('Studio opening: failed-entry recovery passed')
    continue
   }
   if(mode==='automatic'){
    await page.waitForFunction(()=>document.querySelector('#startup-splash img')?.naturalWidth===1254)
    await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#startup-splash img')).opacity)>.99)
    assert.equal(await page.locator('.start-screen').count(),0,'studio logo must exist before app code')
    for(const [name,w,h]of[['portrait',393,852],['landscape',844,390],['compact',360,640]]){
     await page.setViewportSize({width:w,height:h})
     const layout=await page.locator('#startup-splash').evaluate(el=>{
      const image=el.querySelector('img').getBoundingClientRect(),rights=el.querySelector('.startup-rights').getBoundingClientRect()
      return{ratio:image.width/image.height,left:image.left,right:image.right,top:image.top,bottom:image.bottom,rightsTop:rights.top,overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,inert:document.getElementById('root').inert}
     })
     assert.ok(Math.abs(layout.ratio-1)<.01,'logo must retain its square image aspect')
     assert.ok(layout.left>=0&&layout.top>=0&&layout.right<=w&&layout.bottom<layout.rightsTop)
     assert.equal(layout.overflow,false);assert.equal(layout.inert,true)
     await captureStudioScreen(page,`presentation-review/startup-${name}.png`)
    }
    entry.open()
   }
   await page.locator('.start-screen').waitFor({timeout:120000})
   if(mode!=='failed-logo'){
    assert.equal(await page.locator('#root').evaluate(el=>el.inert),true)
    assert.equal(await page.locator('.player-name-modal').count(),0,'name prompt must wait for logo')
    await page.keyboard.press('ArrowDown')
    assert.equal(await page.locator('#root').evaluate(el=>el.contains(document.activeElement)),false,'hidden menu cannot receive focus')
    if(mode==='skip'){
     await captureStudioScreen(page,'presentation-review/startup-skip-landscape.png')
     await page.keyboard.press('Enter')
    }else art.open()
   }
   await page.locator('#startup-splash').waitFor({state:'detached',timeout:10000})
   assert.equal(await page.locator('#root').evaluate(el=>el.inert),false)
   await page.locator('.player-name-modal').waitFor({timeout:10000})
   assert.equal(await page.locator('.start-screen').count(),1,'skip cannot activate the game behind the logo')
   art.open()
   if(mode==='automatic')await page.screenshot({path:'presentation-review/startup-menu-handoff.png'})
   assert.deepEqual(errors,[])
   console.log('Studio opening:',mode,'passed')
  }finally{entry.open();art.open();await context.close()}
 }
}finally{
 await browser?.close()
 server.kill();await exited
}
