export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Elevator {
 constructor(){this.kp=1.8;this.ki=0;this.kd=.5;this.count=2;this.target=9;this.mechanicalDamping=1000;this.integralLimit=60;this.zeroIntegralOnCrossing=false;this.reset()}
 reset(){this.y=0;this.v=0;this.a=0;this.t=0;this.integral=0;this.lastErrorSign=0;this.integralResets=0;this.p=0;this.i=0;this.d=0;this.force=0;this.health=100;this.peak=0;this.overshoot=0;this.start=0;this.tripTime=0;this.dwell=0;this.settle=null;this.crash=0;this.saturated=false;this.impact=0;this.hitCooldown=0;this.history=[];this.sample=0;this.people=Array.from({length:this.count},()=>({z:0,v:0,hit:0}));}
 setTarget(f){this.start=this.y;this.target=f*3;this.tripTime=this.t;this.dwell=0;this.settle=null;this.overshoot=0;this.peak=0;}
 setCount(n){this.count=clamp(n,0,6);this.people=Array.from({length:this.count},()=>({z:0,v:0,hit:0}));this.dwell=0;this.settle=null;}
 get cabinMass(){return 800+75*this.count;}
 get counterweightMass(){return this.cabinMass;}
 setIntegralLimit(value){if(!Number.isFinite(value))return;this.integralLimit=clamp(value,0,200);this.integral=clamp(this.integral,-this.integralLimit,this.integralLimit);this.i=1000*this.ki*this.integral;}
 step(dt){
 this.t+=dt;this.hitCooldown=Math.max(0,this.hitCooldown-dt);this.impact=0;
 const e=this.target-this.y, mass=this.cabinMass, counterweight=this.counterweightMass;
 // Keep the last nonzero sign so positive -> zero -> negative is one crossing.
 const sign=Math.sign(e);
 const crossed=sign!==0&&this.lastErrorSign!==0&&sign!==this.lastErrorSign;
 if(this.zeroIntegralOnCrossing&&crossed){this.integral=0;this.integralResets++;}
 if(sign!==0)this.lastErrorSign=sign;
 this.p=1000*this.kp*e;this.d=-1000*this.kd*this.v;
 const candidate=clamp(this.integral+e*dt,-this.integralLimit,this.integralLimit), candidateForce=this.p+1000*this.ki*candidate+this.d;
 if(!(this.zeroIntegralOnCrossing&&crossed)&&(Math.abs(candidateForce)<=24000||Math.sign(e)!==Math.sign(candidateForce)))this.integral=candidate;
 if(this.ki===0)this.integral=0;
 this.i=1000*this.ki*this.integral;
 const raw=this.p+this.i+this.d;this.force=clamp(raw,-24000,24000);this.saturated=Math.abs(raw)>24000;
 // Ideal 1:1 rope/pulley: both masses accelerate. The adjustable
 // counterweight matches the loaded cabin; gravity cancels mechanically.
 // Motor force is PID only, with no holding bias or position/velocity lock.
 // Passive drive/guide damping: 1000 N·s/m, independent of PID gains.
 // This dissipates momentum while leaving zero resistance at rest.
 this.a=(this.force+(counterweight-mass)*9.81-this.mechanicalDamping*this.v)/(mass+counterweight);
 this.v+=this.a*dt;this.y+=this.v*dt;
 if(this.y<0||this.y>12.5){const impact=Math.abs(this.v);this.y=clamp(this.y,0,12.5);this.v=0;if(impact>1){this.crash++;this.impact=impact;this.health=Math.max(0,this.health-impact*6);}}
 this.peak=Math.max(this.peak,Math.abs(this.a)/9.81);
 // Independent passenger motion in the accelerating cabin; z is feet height.
 for(const q of this.people){q.hit=Math.max(0,q.hit-dt);q.v+=(-9.81-this.a)*dt;q.z+=q.v*dt;let hit=0;if(q.z<0){hit=Math.max(0,-q.v);q.z=0;q.v=hit>1?hit*.13:0;}if(q.z>.95){hit=Math.max(0,q.v);q.z=.95;q.v=-hit*.18;}if(hit>2.5&&q.hit===0){this.impact=Math.max(this.impact,hit);this.health=Math.max(0,this.health-(hit-2.5)*4);q.hit=.2;}}
 if(Math.abs(this.a)>9.81*1.15&&this.count>0){this.health=Math.max(0,this.health-(Math.abs(this.a)/9.81-1.15)*dt*6);if(this.hitCooldown===0){this.impact=Math.max(this.impact,Math.abs(this.a)/4);this.hitCooldown=.5;}}
 const span=this.target-this.start;if(Math.abs(span)>.01)this.overshoot=Math.max(this.overshoot,Math.max(0,(this.y-this.target)*Math.sign(span)/Math.abs(span)*100));
 if(Math.abs(this.target-this.y)<.1&&Math.abs(this.v)<.08){this.dwell+=dt;if(this.dwell>=1&&this.settle===null)this.settle=this.t-this.tripTime;}else{this.dwell=0;this.settle=null;}
 this.sample+=dt;if(this.sample>=.05){this.sample=0;this.history.push({t:this.t,y:this.y,target:this.target,p:this.p,i:this.i,d:this.d});while(this.history.length&&this.history[0].t<this.t-20)this.history.shift();}
 }
}
