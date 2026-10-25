const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../game.js'),'utf8');
class Target {
 constructor(){this.handlers=new Map();this.style={};this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};this.dataset={action:'attack'}}
 addEventListener(n,f){if(!this.handlers.has(n))this.handlers.set(n,new Set());this.handlers.get(n).add(f)}
 removeEventListener(n,f){this.handlers.get(n)?.delete(f)}
 fire(n,extra={}){for(const f of this.handlers.get(n)||[])f({preventDefault(){},pointerId:1,clientX:90,clientY:50,...extra})}
 count(){return [...this.handlers.values()].reduce((n,a)=>n+a.size,0)}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}
 setPointerCapture(){}
}
class Events {
 constructor(){this.items=[]}
 on(n,f,c){this.items.push({n,f,c});return this}
 once(n,f,c){this.items.push({n,f,c,once:true});return this}
 off(n,f,c){this.items=this.items.filter(e=>e.n!==n||e.f!==f||e.c!==c)}
 fire(n){for(const e of this.items.filter(e=>e.n===n)){if(e.once)this.items=this.items.filter(x=>x!==e);e.f.call(e.c)}}
}
class Vector {constructor(x=0,y=0){this.set(x,y)}set(x,y){this.x=x;this.y=y;return this}length(){return Math.hypot(this.x,this.y)}setLength(n){const l=this.length();if(l){this.x*=n/l;this.y*=n/l}return this}}
const button=new Target(),zone=new Target(),base=new Target(),knob=new Target(),window=new Target();
const document={querySelectorAll:()=>[button],getElementById:id=>({'joystick-zone':zone,'joystick-base':base,'joystick-knob':knob}[id])};
const Input=vm.runInNewContext(`(${source.slice(source.indexOf('  class InputSystem'),source.indexOf('  class SoundKit'))})`,{document,window,Phaser:{Math:{Vector2:Vector}}});
const scene={running:true,input:{keyboard:{createCursorKeys:()=>({}),addKeys:()=>({}),resetKeys(){}}},events:new Events(),player:{setVelocity(){}}};
for(let i=0;i<50;i++) {
 const input=new Input(scene);
 assert.equal(button.count(),5);assert.equal(zone.count(),5);assert.equal(window.count(),1);
 button.fire('pointerdown');assert(input.pulses.has('attack'));
 zone.fire('pointerdown');const original=input.touchVector.x;assert(original>0);
 zone.fire('pointerdown',{pointerId:2,clientX:10});assert.equal(input.touchVector.x,original,'Second finger cannot steal the joystick');
 scene.pausedByUser=true;scene.events.fire('pause');assert.equal(input.touchVector.x,0);assert.equal(input.pulses.size,0);assert.equal(knob.style.transform,'translate3d(0, 0, 0)');
 button.fire('pointerdown');assert.equal(input.pulses.size,0,'No queued attack while paused');scene.pausedByUser=false;
 zone.fire('pointerdown');window.fire('blur');assert.equal(input.touchVector.x,0);
 scene.events.fire('shutdown');assert.equal(button.count()+zone.count()+window.count(),0);assert.equal(scene.events.items.length,0);
}
console.log('50 scene restarts: no listener growth, stuck joystick, second-finger takeover or paused attacks.');
