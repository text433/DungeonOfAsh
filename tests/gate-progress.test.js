const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../game.js'), 'utf8');
const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const method = (name, next) => source.slice(source.indexOf(`    ${name}(`), source.indexOf(`    ${next}(`));
const classes = { toggle() {} };
const track = { attrs: {}, setAttribute(k,v) { this.attrs[k]=v; }, style: { setProperty(k,v) { this[k]=v; } } };
const label = {};
const dom = { prompt: { classList: classes }, bossProgress: { classList: classes, querySelector(s) { return s.endsWith('label') ? label : track; } } };
const Scene = vm.runInNewContext(`(class {${method('updateBossProgressUi','updateHud')}${method('updateInteraction','performInteraction')}${method('updateAutoDoors','updateAutoChests')}${method('addGateWallReturns','isFlatWallFace')}${method('isFlatWallFace','addTorchGlow')}})`, {
  TILE:16, BOSS_GATE_WALL_FRAME:38, dom, Phaser:{Math:{Distance:{Between:(a,b,c,d)=>Math.hypot(a-c,b-d)}}}
});
const scene = new Scene();
scene.area='dungeon';scene.player={x:100,y:120};scene.door={x:100,y:100,active:true};
scene.state={totalMonsters:100,requiredKills:80,monsterKills:0,bossUnlocked:false};
let opened=0; scene.openDoor=()=>opened++;
for (const kills of [0,79,80,100]) {
  scene.state.monsterKills=kills;scene.state.bossUnlocked=kills>=80;
  scene.updateBossProgressUi();scene.updateInteraction();scene.updateAutoDoors();
  assert.equal(track.attrs['aria-valuenow'],Math.min(kills,80));
  assert.equal(track.style['--progress'],`${Math.min(kills/80,1)*100}%`);
  if(kills<80) {
    assert.equal(opened,0);assert.match(dom.prompt.textContent,/SAKAUJ VĒL/);
    assert.equal(dom.prompt.disabled,true);
  }
}
assert.equal(opened,2);
scene.state={totalMonsters:21,requiredKills:17,monsterKills:16};
scene.updateBossProgressUi();assert.equal(track.attrs['aria-valuenow'],16);assert.match(label.textContent,/76%/);
scene.state.monsterKills=17;scene.state.bossUnlocked=true;
scene.updateBossProgressUi();assert.equal(track.style['--progress'],'100%');
scene.stairs={x:100,y:120};scene.state.doorOpened=true;scene.updateInteraction();
assert.equal(dom.prompt.disabled,true);assert.equal(scene.nearInteraction,null);
assert(!html.includes('data-action="interact"'));
assert(!html.includes('key-status'));
assert(!/hasKey|loot-key|keyChance/.test(source));
const strips=[];
scene.highWallFrame=(frame)=>Math.floor(frame/12)*24+frame%12;
scene.add={image(x,y,key,frame) {
  const strip={x,y,key,frame,setOrigin(){return this;},setCrop(x,y,w,h){Object.assign(this,{cropX:x,w,h});return this;},setDepth(){return this;}};
  strips.push(strip);return strip;
}};
scene.addGateWallReturns({gateLeft:10,gateRight:12,wallY:8},48);
assert.equal(strips[0].frame,74,'Use the tall atlas frame mapping');
const leftEnd=strips[0].x-8+strips[0].cropX+strips[0].w;
const rightStart=strips[1].x-8+strips[1].cropX;
assert(leftEnd>=160+48*6/64,'Wall meets left visible jamb');
assert(rightStart<=208-48*6/64,'Wall meets right visible jamb');
assert(rightStart-leftEnd>=32,'Leave at least two tiles of open doorway');
scene.wallCells=new Set(['9,8','10,8','11,8']);scene.hasFloor=(x,y)=>y===9;
assert(scene.isFlatWallFace(10,8));assert(!scene.isFlatWallFace(9,8));
console.log('Gate progress, early-door feedback, touch context, key removal, wall joins and safe decor passed.');
