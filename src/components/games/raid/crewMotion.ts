const crewUnit=(v:number)=>Math.max(0,Math.min(1,v))

/** Distance, not elapsed time, drives each step. The stance foot stays on the deck. */
export function sampleCrewFoot(distance:number,leg:number,running=false){
  const stride=running?25:14,duty=running?.46:.64
  const phase=((distance/stride+leg*.5)%1+1)%1
  const reach=stride*duty/2
  if(phase<duty){const t=phase/duty;return{x:reach-stride*phase,y:0,planted:true,roll:t<.14?(.14-t)*1.8:t>.8?-(t-.8)*1.2:0}}
  const t=(phase-duty)/(1-duty),s=t*t*(3-2*t)
  return{x:-reach+reach*2*s,y:-Math.sin(t*Math.PI)*(running?4:2.3),planted:false,roll:-.12}
}

/** Two real leg segments, with the knee bending forward rather than scissoring. */
export function crewKnee(hx:number,hy:number,ax:number,ay:number){
  const dx=ax-hx,dy=ay-hy,d=Math.max(.001,Math.hypot(dx,dy)),bend=Math.sqrt(Math.max(0,5.4**2-(d/2)**2))
  return{x:(hx+ax)/2+dy/d*bend,y:(hy+ay)/2-dx/d*bend}
}

export function sampleCrewPatrol(time:number,a:number,b:number,speed:number,offset=0){
  const length=Math.abs(b-a),ramp=.25,travel=length/speed+ramp,hold=.5,half=travel+hold,period=half*2
  const clock=Math.max(0,time+offset),rounds=Math.floor(clock/period),phase=clock%period,back=phase>=half,t=back?phase-half:phase
  const moving=t<travel,v=length/(travel-ramp)
  let distance=t<ramp?v*t*t/(2*ramp):t>travel-ramp?length-v*(travel-Math.min(t,travel))**2/(2*ramp):v*(t-ramp/2)
  distance=Math.max(0,Math.min(length,distance))
  const direction=back?-1:1,turn=crewUnit((t-travel)/hold)
  return{x:back?b-distance:a+distance,distance:rounds*length*2+(back?length:0)+distance,moving,facing:moving?direction:turn<.5?direction:-direction}
}
