import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Elevator} from '../dist/engine.js';
const run=(p,i,d,n=2,f=3,seconds=40)=>{const s=new Elevator();Object.assign(s,{kp:p,ki:i,kd:d,count:n,target:f*3});s.reset();let settled=null;for(let k=0;k<seconds/.005;k++){s.step(.005);if(settled===null&&s.settle!==null)settled=s.settle;assert(Number.isFinite(s.y+s.v+s.integral));assert(s.y>=0&&s.y<=12.5);assert(Math.abs(s.force)<=24000);}return{s,settled};};
const bounce=run(1.8,0,.5),smooth=run(1.8,0,3.5);assert(bounce.s.overshoot>20);assert(smooth.s.overshoot<8);assert(smooth.settled!==null);assert(Math.abs(smooth.s.target-smooth.s.y)<.1);assert(Math.abs(bounce.s.target-bounce.s.y)<.1);
for(const [p,i,d,n,f,limit]of[[1.8,0,3.5,0,3,40],[1.8,0,3.5,2,3,40],[1.8,0,4.2,6,4,25]]){const {s,settled}=run(p,i,d,n,f);assert(settled!==null&&settled<=limit);assert(s.health>=80);if(n!==2)assert(s.overshoot<8);}
const chaos=run(12,4,0);assert(chaos.s.health<80);assert(chaos.s.crash>0);const retarget=smooth.s;retarget.setTarget(0);for(let k=0;k<9000;k++)retarget.step(.005);assert(retarget.y<.1);retarget.reset();assert.equal(retarget.t,0);assert.equal(retarget.health,100);assert.equal(retarget.kp,1.8);
// A balanced cabin holds any mid-shaft height with zero motor force,
// even when passengers change, without a position clamp or synthetic brake.
for(let count=0;count<=6;count++)for(const height of [1.5,6,10.5]){
 const s=new Elevator();s.kp=s.ki=s.kd=0;s.y=height;s.setCount(count);
 assert.equal(s.counterweightMass,s.cabinMass);
 for(let k=0;k<2000;k++)s.step(.005);
 assert.equal(s.y,height);assert.equal(s.v,0);assert.equal(s.force,0);assert.equal(s.a,0);
 s.setCount((count+3)%7);s.step(.005);assert.equal(s.y,height);assert.equal(s.a,0);
 // Turning off motor effort while moving must preserve momentum.
 s.v=1;const oldY=s.y,expectedA=-1000/(s.cabinMass+s.counterweightMass);
 s.step(.005);assert.equal(s.a,expectedA);assert(s.v>0&&s.v<1);assert(s.y>oldY);
}
for(const sign of [-1,1]){const s=new Elevator();s.count=6;s.y=6;s.target=6+sign;s.kp=1;s.ki=s.kd=0;s.step(.005);assert.equal(s.force,sign*1000);assert.equal(s.a,sign*1000/2500);}
// User regression: P=.1, I=D=0 must approach without runaway overshoot.
for(let count=0;count<=6;count++)for(const [start,target] of [[0,9],[12,3],[3,12],[9,0]]){
 const s=new Elevator();s.kp=.1;s.ki=s.kd=0;s.setCount(count);s.y=start;s.setTarget(target/3);
 const direction=Math.sign(target-start);let prev=start;
 for(let k=0;k<24000;k++){s.step(.005);assert((s.y-prev)*direction>=-1e-10);assert((s.y-target)*direction<=1e-9);prev=s.y;}
 assert(Math.abs(s.y-target)<.01);assert(s.overshoot<.01);assert.equal(s.crash,0);assert.equal(s.health,100);
}
// Passive damping dissipates kinetic energy without adding a position lock.
for(const velocity of [-1,1]){const s=new Elevator();s.kp=s.ki=s.kd=0;s.y=6;s.v=velocity;let prevEnergy=Infinity;
 for(let k=0;k<600;k++){s.step(.005);const energy=.5*(s.cabinMass+s.counterweightMass)*s.v*s.v;assert(energy<prevEnergy);prevEnergy=energy;assert(s.v*velocity>0);}
}
// Optional zero-crossing reset, including an exact-zero intermediate sample.
for(const enabled of [false,true]){
 const s=new Elevator();s.ki=.2;s.zeroIntegralOnCrossing=enabled;s.integral=5;s.lastErrorSign=1;s.y=10;s.target=9;s.step(.005);
 assert.equal(s.integralResets,enabled?1:0);assert(enabled?s.integral===0:s.integral>4.9);
 s.integral=4;s.lastErrorSign=-1;s.y=9;s.v=0;s.step(.005);assert.equal(s.integralResets,enabled?1:0);
 s.y=8;s.step(.005);assert.equal(s.integralResets,enabled?2:0);assert(enabled?s.integral===0:s.integral>3.9);
 s.y=8;s.step(.005);assert.equal(s.integralResets,enabled?2:0);
 s.integral=3;s.lastErrorSign=1;s.setTarget(0);s.step(.005);assert.equal(s.integralResets,enabled?3:0);
 s.reset();assert.equal(s.integralResets,0);assert.equal(s.lastErrorSign,0);assert.equal(s.zeroIntegralOnCrossing,enabled);
}
// Adjustable accumulation clamp, live reductions, zero and persistence.
const limited=new Elevator();limited.ki=.5;limited.setIntegralLimit(2);
for(let k=0;k<3000;k++){limited.step(.005);assert(Math.abs(limited.integral)<=2);}
limited.integral=1.8;limited.setIntegralLimit(.5);assert.equal(limited.integral,.5);assert.equal(limited.i,250);
limited.integral=-1.8;limited.setIntegralLimit(.25);assert.equal(limited.integral,-.25);
limited.setIntegralLimit(0);limited.step(.005);assert(limited.integral===0);assert(limited.i===0);
limited.setIntegralLimit(3);limited.reset();assert.equal(limited.integralLimit,3);
limited.setIntegralLimit(NaN);assert.equal(limited.integralLimit,3);
// Browser-independent smoke check of every bound UI action and canvas draw path.
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
function element(){return {value:'0',max:'12',checked:true,hidden:false,disabled:false,style:{},dataset:{},tagName:'DIV',listeners:{},classList:{toggle(){}},addEventListener(k,f){this.listeners[k]=f},setAttribute(){},getBoundingClientRect(){return{width:600,height:440}},getContext(){return ctx},showModal(){this.open=true},close(){this.open=false},click(){this.onclick?.()}};}
const els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],element()]));els.speed.value='1';const floors=[0,1,2,3,4].map(n=>{const e=element();e.dataset.floor=''+n;return e});let frame;
const doc={hidden:false,getElementById:k=>{assert(els[k],`missing DOM id ${k}`);return els[k]},querySelectorAll:()=>floors,querySelector:()=>element(),addEventListener(){}};
const sandbox={document:doc,window:{addEventListener(){}},devicePixelRatio:1,matchMedia:()=>({matches:false}),requestAnimationFrame:f=>frame=f,Elevator,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),console};
vm.runInNewContext(fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,''),sandbox);
for(let t=0;t<200;t+=16)frame(t);els['zero-integral'].checked=true;els['zero-integral'].onchange();els['zero-integral'].checked=false;els['zero-integral'].onchange();els.run.click();for(let t=200;t<3000;t+=16)frame(t);assert(els.clock.textContent!=='00.00 s');els['force-tab'].click();frame(3016);els.more.click();assert.equal(els.pax.value,3);els.less.click();assert.equal(els.pax.value,2);els.preset.value='chaos';els.preset.onchange();els.run.click();for(let t=3032;t<7000;t+=16)frame(t);els.blood.checked=false;els.blood.onchange();els.clean.click();els.reset.click();els.challenges.click();assert.equal(els.pax.value,0);assert.equal(els.more.disabled,true);els.sandbox.click();assert.equal(els.more.disabled,false);els.help.click();assert(els['help-dialog'].open);els['close-help'].click();assert(!els['help-dialog'].open);
console.log('PASS: physics bounds, PID effects, all 3 challenge solutions, collisions/health, reset/retarget, UI bindings and both canvas render paths.');
