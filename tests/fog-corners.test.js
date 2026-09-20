const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rules = require('../map-rules');
const source = fs.readFileSync(require.resolve('../game.js'), 'utf8');
const start = source.indexOf('    updateFogOfWar(force = false)');
const end = source.indexOf('    isWorldTileExplored(', start);
const Scene = vm.runInNewContext(`(class { ${source.slice(start, end)} })`, { TILE:16, MAP_W:64, MAP_H:48 });
const scene = new Scene();
scene.area = 'dungeon';
scene.player = { active:true, x:13*16+8, y:13*16+8 };
scene.floorCells = rules.buildFloorCells([[10,10,6,6]]);
scene.wallCells = rules.buildWallCells(scene.floorCells,64,48);
scene.currentVisibleCells = new Set();
scene.visitedCells = new Set();
scene.roomDoors = [];
const covered = new Set();
scene.fogGraphics = { clear(){covered.clear();}, fillStyle(){}, fillRect(x,y){covered.add(`${x/16},${y/16}`);} };
scene.updateFogOfWar(true);
for(const [x,y] of [[9,9],[16,9],[9,16],[16,16]]) {
 assert(scene.currentVisibleCells.has(`${x},${y}`), `Corner ${x},${y} is hidden`);
 for(let row=y-1;row<=y+1;row++) {
  assert(!covered.has(`${x},${row}`), `Fog cuts corner bricks at ${x},${row}`);
 }
}
assert(!scene.currentVisibleCells.has('30,30'), 'Distant unexplored cells must stay hidden');
console.log('Fog corner test passed: four complete corners, including both lower brick faces.');
scene.floorCells = rules.buildFloorCells([[10,8,2,14]]);
scene.wallCells = rules.buildWallCells(scene.floorCells,64,48);
scene.player.x = 10*16+8;
scene.player.y = 17*16+8;
scene.visitedCells.clear();
scene.roomDoors = [{opened:false,cells:[{x:10,y:14},{x:11,y:14}]}];
scene.updateFogOfWar(true);
assert(scene.currentVisibleCells.has('10,16'), 'Near side of closed door must remain visible');
assert(!scene.currentVisibleCells.has('10,13'), 'Closed doors must still hide the room behind them');
console.log('Closed-door fog isolation passed.');

// Raised door pixels remain visible without revealing hidden floor cells.
const cap = { visible:false, setVisible(value) { this.visible = value; } };
scene.doorFogCaps = [{cap, cells:scene.roomDoors[0].cells}];
scene.updateFogOfWar(true);
assert(cap.visible, 'Visible door must be drawn above the fog covering its raised frame');
assert(covered.has('10,13'), 'Room behind the door must remain fogged');
scene.player.y = 21*16+8;
scene.floorCells = rules.buildFloorCells([[10,20,2,2]]);
scene.wallCells = rules.buildWallCells(scene.floorCells,64,48);
scene.updateFogOfWar(true);
assert(!cap.visible, 'Unreachable doors must not shine through unexplored fog');

const capStart = source.indexOf('    createDoorFogCap(sprite, cells)');
const capEnd = source.indexOf('    doorwayOccupied(', capStart);
const CapScene = vm.runInNewContext(`(class { ${source.slice(capStart, capEnd)} })`, { TILE:16 });
const capScene = new CapScene();
const overlay = {
 setOrigin(){return this;}, setDisplaySize(){return this;},
 setCrop(...crop){this.crop=crop;return this;}, setDepth(v){this.depth=v;return this;},
 setVisible(v){this.visible=v;return this;}, setTexture(v){this.texture=v;return this;}
};
capScene.add = {image:()=>overlay};capScene.doorFogCaps=[];
let updateFrame;
const doorSprite = {x:176,y:240,width:64,height:64,displayWidth:40,displayHeight:40,
 texture:{key:'ash_door_f0'},on(event,fn){assert.equal(event,'animationupdate');updateFrame=fn;}};
capScene.createDoorFogCap(doorSprite,[{x:10,y:14}]);
assert.deepEqual(overlay.crop,[0,0,64,39], 'Only raised door pixels may override fog and depth');
assert(overlay.depth>1000000);
assert.equal(overlay.visible,false);
doorSprite.texture.key='ash_door_f5';updateFrame();
assert.equal(overlay.texture,'ash_door_f5','Overlay must follow each animation frame');
console.log('Door fog cap passed: synchronized frames, hidden room, normal player-depth row.');
