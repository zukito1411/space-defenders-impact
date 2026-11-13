import { crewKnee, sampleCrewFoot } from './crewMotion'

/** Side-on micro-sprite with planted heels, articulated knees and counter-swinging arms. */
export function drawDeckPerson(ctx:CanvasRenderingContext2D,x:number,y:number,height:number,distance:number,suit:string,facing:number,moving:boolean,wands=false,signalling=false,running=false,climbing=false){
  ctx.save();ctx.translate(x,y);ctx.scale(facing*height/22,height/22)
  const phase=distance/(running?25:14)*Math.PI*2,bob=moving?Math.cos(phase*2)*.32:0
  const hipY=-8.7+bob,lean=running?1.8:0
  ctx.lineCap='round';ctx.lineJoin='round'
  const arm=(near:boolean)=>{
    const swing=moving?Math.sin(phase+(near?0:Math.PI))*(running?3.8:2.3):0
    const hx=signalling?(near?5.5:-5.5):climbing?2.8+Math.sin(phase+(near?0:Math.PI))*1.8:lean+swing
    const hy=signalling?-20+Math.sin(distance*.8)*.8:climbing?-19+Math.cos(phase+(near?0:Math.PI))*1.8:-10.5+bob+(running?-2:0)
    ctx.strokeStyle=near?suit:'#27424e';ctx.lineWidth=2
    ctx.beginPath();ctx.moveTo(lean,-15+bob);ctx.lineTo((hx+lean)/2+(running?1:0),-12.5+bob);ctx.lineTo(hx,hy);ctx.stroke()
    ctx.fillStyle='#c7d4d1';ctx.fillRect(hx-.8,hy-.7,1.6,1.5)
    if(wands){ctx.strokeStyle='#153126';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(hx+(near?1:-1),hy-6.5);ctx.stroke();ctx.strokeStyle='#a9ffc2';ctx.lineWidth=1.6;ctx.stroke()}
  }
  arm(false)
  for(const leg of[1,0]){
    const foot=moving?sampleCrewFoot(distance,leg,running):{x:leg?-1.6:1.4,y:0,roll:0}
    const ankleY=foot.y-1,knee=crewKnee(0,hipY,foot.x,ankleY)
    ctx.strokeStyle=leg?'#20333e':'#59717a';ctx.lineWidth=leg?2.4:2.6
    ctx.beginPath();ctx.moveTo(0,hipY);ctx.lineTo(knee.x,knee.y);ctx.lineTo(foot.x,ankleY);ctx.stroke()
    ctx.save();ctx.translate(foot.x,foot.y-.7);ctx.rotate(foot.roll);ctx.fillStyle=leg?'#101d26':'#859397';ctx.fillRect(-1.2,-.7,3.4,1.4);ctx.restore()
  }
  ctx.fillStyle=suit;ctx.beginPath();ctx.moveTo(lean-2.8,-16+bob);ctx.lineTo(lean+2.8,-16+bob);ctx.lineTo(3,hipY);ctx.lineTo(-2.5,hipY);ctx.closePath();ctx.fill()
  ctx.fillStyle='#dbe5d8';ctx.fillRect(lean-2.3,-12.3+bob,4.6,.9)
  ctx.fillStyle='#dde1c9';ctx.beginPath();ctx.arc(lean,-18.6+bob,2.8,Math.PI,Math.PI*2);ctx.lineTo(lean+2.8,-16.7+bob);ctx.lineTo(lean-2.8,-16.7+bob);ctx.closePath();ctx.fill()
  ctx.fillStyle='#4cb4c1';ctx.fillRect(lean+.5,-19+bob,2.5,1.4)
  arm(true);ctx.restore()
}
