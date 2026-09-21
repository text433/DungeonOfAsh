const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../game.js'),'utf8');
const start=source.indexOf('    createCrate(tileX, tileY)');
const end=source.indexOf('    addProceduralWallDecorations()',start);
const Scene=vm.runInNewContext(`(class {${source.slice(start,end)}})`,{TILE:16,ASSETS:{torch:['torch']}});
const scene=new Scene();
const sprites=[];
const create=(x,y)=>{
 const s={x,y,body:{setSize(w,h){this.w=w;this.h=h;return this;},setOffset(x,y){this.x=x;this.y=y;return this;}},
 setOrigin(){return this;},setDepth(){return this;},refreshBody(){return this;},setDisplaySize(){return this;},
 setData(k,v){this.data={[k]:v};return this;},getData(k){return this.data[k];},play(){return this;}};
 sprites.push(s);return s;
};
scene.props={create};scene.add={sprite:create};
const a=scene.createCrate(10,10),b=scene.createCrate(10,12);
// Crate image is 16x24; body is anchored to its bottom, within its floor tile.
const aBottom=a.y-24+a.body.y+a.body.h;
const bTop=b.y-24+b.body.y;
assert(bTop-aBottom>=16,'Even old two-tile crate spacing must leave a full tile between bases');
assert.equal(aBottom,11*16);
scene.wallCells=new Set(['10,10','11,10','12,10','13,10']);
scene.hasFloor=(x,y)=>x>=10&&x<=13&&y===11;
scene.addTorchGlow=()=>{};
scene.wallTorches=[];scene.addWallTorch(10,10);
assert.equal(scene.wallTorches[0].getData('cell'),'11,10','Corner torch must move inward');
scene.wallCells=new Set(['20,10']);scene.addWallTorch(20,10);
assert.equal(scene.wallTorches.length,1,'Isolated edge must not receive a torch');
assert(!source.includes('targets: this.townExitMarkers'),'No animated arrows over stairs');
console.log('Crate foot clearance and torch corner avoidance passed.');
