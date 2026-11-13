const crewUnit=(v:number)=>Math.max(0,Math.min(1,v))

export function sampleCrewPatrol(time:number,a:number,b:number,speed:number,offset=0){
  const length=Math.abs(b-a),ramp=.25,travel=length/speed+ramp,hold=.5,half=travel+hold,period=half*2
  const clock=Math.max(0,time+offset),rounds=Math.floor(clock/period),phase=clock%period,back=phase>=half,t=back?phase-half:phase
  const moving=t<travel,v=length/(travel-ramp)
  let distance=t<ramp?v*t*t/(2*ramp):t>travel-ramp?length-v*(travel-Math.min(t,travel))**2/(2*ramp):v*(t-ramp/2)
  distance=Math.max(0,Math.min(length,distance))
  const direction=back?-1:1,turn=crewUnit((t-travel)/hold)
  return{x:back?b-distance:a+distance,distance:rounds*length*2+(back?length:0)+distance,moving,facing:moving?direction:turn<.5?direction:-direction}
}
